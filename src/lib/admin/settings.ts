/**
 * Platform settings — stored as LearningEvent snapshots for MVP.
 * Replace with Settings table when multi-admin concurrent edits matter.
 */

import { prisma } from "@/lib/prisma";
import { platformConfig } from "@/lib/platform";
import type { AdminActor, PlatformSettings } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

const DEFAULTS: PlatformSettings = {
  maintenanceMode: false,
  featureFlags: {
    tutor: true,
    exams: true,
    leaderboard: true,
    challenges: true,
  },
  xpDailySoftCap: 800,
  defaultExamTimeSec: 3600,
  defaultPracticeCount: 10,
  tutorProvider: process.env.TUTOR_PROVIDER ?? "mock",
  passThresholdPct: platformConfig.passThresholdPct,
};

export async function getSettings(actor: AdminActor): Promise<PlatformSettings> {
  assertPermission(actor, "admin.access");
  const latest = await prisma.learningEvent.findFirst({
    where: { type: "platform_settings" },
    orderBy: { createdAt: "desc" },
  });
  if (!latest?.payload) return { ...DEFAULTS };
  return { ...DEFAULTS, ...(latest.payload as object) } as PlatformSettings;
}

export async function updateSettings(
  actor: AdminActor,
  patch: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  assertPermission(actor, "settings.write");
  const current = await getSettings(actor);
  const next = { ...current, ...patch, featureFlags: {
    ...current.featureFlags,
    ...(patch.featureFlags ?? {}),
  } };

  await prisma.learningEvent.create({
    data: {
      userId: actor.userId,
      type: "platform_settings",
      payload: next as object,
    },
  });

  await writeAudit(actor, "settings.update", "PlatformSettings", undefined, {
    patch,
  });

  return next;
}
