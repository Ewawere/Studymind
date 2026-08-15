/**
 * Lightweight experimentation framework.
 * Deterministic assignment from userId hash — stable across sessions.
 * Experiment defs can live in code or platform settings.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { ExperimentAssignment, ExperimentDef } from "./types";
import type { Prisma } from "@prisma/client";

/** In-code experiment registry — extend as needed */
export const EXPERIMENTS: ExperimentDef[] = [
  {
    key: "tutor_style_default",
    name: "Default tutor explanation style",
    description: "teacher vs step_by_step as default",
    variants: ["control", "step_by_step"],
    trafficPct: 100,
    status: "running",
  },
  {
    key: "practice_queue_size",
    name: "Practice session length",
    description: "10 vs 15 questions default",
    variants: ["control", "longer"],
    trafficPct: 50,
    status: "running",
  },
];

function hashBucket(userId: string, experimentKey: string): number {
  const h = createHash("sha256")
    .update(`${experimentKey}:${userId}`)
    .digest();
  return h.readUInt32BE(0) % 100;
}

export function getExperiment(key: string): ExperimentDef | undefined {
  return EXPERIMENTS.find((e) => e.key === key);
}

export function assignVariant(
  userId: string,
  experimentKey: string
): ExperimentAssignment | null {
  const exp = getExperiment(experimentKey);
  if (!exp || exp.status === "paused" || exp.status === "draft") return null;

  const traffic = exp.trafficPct ?? 100;
  const bucket = hashBucket(userId, experimentKey);
  if (bucket >= traffic) {
    return {
      experimentKey,
      userId,
      variant: "control",
      assignedAt: new Date().toISOString(),
    };
  }

  const variantIndex = hashBucket(userId, experimentKey + ":v") % exp.variants.length;
  return {
    experimentKey,
    userId,
    variant: exp.variants[variantIndex] ?? "control",
    assignedAt: new Date().toISOString(),
  };
}

export async function trackExperimentExposure(
  userId: string,
  experimentKey: string,
  variant: string,
  meta?: Record<string, unknown>
) {
  await prisma.learningEvent.create({
    data: {
      userId,
      type: "experiment_exposure",
      payload: { experimentKey, variant, meta } as Prisma.InputJsonValue,
    },
  });
}

export async function trackExperimentConversion(
  userId: string,
  experimentKey: string,
  conversion: string,
  value?: number
) {
  await prisma.learningEvent.create({
    data: {
      userId,
      type: "experiment_conversion",
      payload: { experimentKey, conversion, value } as Prisma.InputJsonValue,
    },
  });
}

/** Convenience: assign + optionally log exposure */
export async function getVariant(
  userId: string,
  experimentKey: string,
  opts?: { trackExposure?: boolean }
): Promise<string> {
  const assignment = assignVariant(userId, experimentKey);
  const variant = assignment?.variant ?? "control";
  if (opts?.trackExposure !== false && assignment) {
    await trackExperimentExposure(userId, experimentKey, variant).catch(
      () => undefined
    );
  }
  return variant;
}
