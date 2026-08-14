/**
 * Bug reports — stored as LearningEvents for MVP; promote to BugReport table later.
 */

import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/platform";
import type { BugReportInput, BugStatus } from "./types";
import type { Prisma } from "@prisma/client";

export async function submitBugReport(input: BugReportInput) {
  if (!input.title?.trim() || !input.description?.trim()) {
    throw new Error("Title and description are required");
  }

  // LearningEvent requires userId — use provided or a system placeholder pattern:
  // Prefer authenticated user; for anonymous, require userId from session layer.
  if (!input.userId) {
    throw new Error("userId is required to submit a bug report");
  }

  const event = await prisma.learningEvent.create({
    data: {
      userId: input.userId,
      type: "bug_report",
      payload: {
        title: input.title.trim().slice(0, 200),
        description: input.description.trim().slice(0, 5000),
        severity: input.severity ?? "medium",
        status: "open" satisfies BugStatus,
        page: input.page,
        userAgent: input.userAgent,
        meta: input.meta,
      } as Prisma.InputJsonValue,
    },
  });

  await publish("TutorMessageSent", input.userId, {
    kind: "bug_report",
    eventId: event.id,
  }).catch(() => undefined);

  return { id: event.id, status: "open" as const };
}

export async function listBugReports(opts?: {
  status?: BugStatus;
  limit?: number;
}) {
  const rows = await prisma.learningEvent.findMany({
    where: { type: "bug_report" },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
  });

  return rows
    .map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        userId: r.userId,
        title: String(p.title ?? ""),
        description: String(p.description ?? ""),
        severity: String(p.severity ?? "medium"),
        status: String(p.status ?? "open") as BugStatus,
        page: p.page ? String(p.page) : undefined,
        createdAt: r.createdAt.toISOString(),
      };
    })
    .filter((r) => (opts?.status ? r.status === opts.status : true));
}

export async function updateBugStatus(
  eventId: string,
  status: BugStatus,
  actorUserId: string
) {
  const existing = await prisma.learningEvent.findUniqueOrThrow({
    where: { id: eventId },
  });
  const payload = {
    ...((existing.payload as object) ?? {}),
    status,
    updatedBy: actorUserId,
    updatedAt: new Date().toISOString(),
  } as Prisma.InputJsonValue;
  await prisma.learningEvent.update({
    where: { id: eventId },
    data: { payload },
  });
  return { id: eventId, status };
}
