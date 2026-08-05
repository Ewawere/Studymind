/**
 * Runtime feature flags — env defaults + optional admin overrides via settings.
 */

import { platformConfig } from "./config";

const defaults: Record<string, boolean> = {
  tutor: true,
  exams: true,
  leaderboard: true,
  challenges: true,
  gamification: true,
  imports: true,
  maintenance: false,
};

let overrides: Record<string, boolean> = {};

export function setFeatureFlags(flags: Record<string, boolean>) {
  overrides = { ...overrides, ...flags };
}

export function isFeatureEnabled(flag: string): boolean {
  if (flag in overrides) return !!overrides[flag];
  if (flag in defaults) return defaults[flag];
  // env override FEATURE_FLAG_TUTOR=false
  const envKey = `FEATURE_FLAG_${flag.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal === "0" || envVal === "false") return false;
  if (envVal === "1" || envVal === "true") return true;
  return true;
}

export function assertFeature(flag: string) {
  if (!isFeatureEnabled(flag)) {
    throw new Error(`Feature disabled: ${flag}`);
  }
  if (isFeatureEnabled("maintenance") && flag !== "admin") {
    throw new Error("Platform is in maintenance mode");
  }
}

export function listFeatureFlags() {
  const keys = new Set([...Object.keys(defaults), ...Object.keys(overrides)]);
  return Object.fromEntries([...keys].map((k) => [k, isFeatureEnabled(k)]));
}

void platformConfig; // keep import used for future env coupling
