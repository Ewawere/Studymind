/**
 * Notification service — email + in-app events.
 * Push (FCM) can be added without changing call sites.
 */

import { platformConfig } from "./config";
import { log } from "./logging";
import { prisma } from "@/lib/prisma";
import { enqueue } from "./queue";
import type { Prisma } from "@prisma/client";

export type NotificationChannel = "email" | "in_app" | "push";

export interface NotificationMessage {
  userId: string;
  channel: NotificationChannel;
  template:
    | "welcome"
    | "study_reminder"
    | "sm2_due"
    | "exam_reminder"
    | "achievement"
    | "streak"
    | "generic";
  subject?: string;
  body: string;
  meta?: Record<string, unknown>;
}

export async function sendNotification(msg: NotificationMessage) {
  if (msg.channel === "in_app") {
    await prisma.learningEvent.create({
      data: {
        userId: msg.userId,
        type: "notification",
        payload: {
          template: msg.template,
          subject: msg.subject,
          body: msg.body,
          meta: msg.meta,
        } as Prisma.InputJsonValue,
      },
    });
    return { ok: true, channel: "in_app" as const };
  }

  if (msg.channel === "email") {
    return sendEmail(msg);
  }

  // push placeholder
  log.info("notification.push_skipped", { userId: msg.userId });
  return { ok: false, channel: "push" as const };
}

async function sendEmail(msg: NotificationMessage) {
  const user = await prisma.user.findUnique({ where: { id: msg.userId } });
  if (!user?.email) return { ok: false, channel: "email" as const };

  const { provider, apiKey, from } = platformConfig.email;
  const subject = msg.subject ?? "StudyMind";
  const html = `<p>${msg.body}</p>`;

  if (provider === "console" || !apiKey) {
    log.info("email.console", { to: user.email, subject, body: msg.body });
    return { ok: true, channel: "email" as const };
  }

  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: user.email,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      log.error("email.resend_failed", { status: res.status });
      return { ok: false, channel: "email" as const };
    }
    return { ok: true, channel: "email" as const };
  }

  log.warn("email.provider_unsupported", { provider });
  return { ok: false, channel: "email" as const };
}

export async function queueNotification(msg: NotificationMessage) {
  return enqueue("send_notification", msg as unknown as Record<string, unknown>);
}
