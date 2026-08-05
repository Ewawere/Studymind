/**
 * Level curve: level = floor(sqrt(xp / 50)) + 1
 * XP to reach level L = 50 * (L-1)^2
 */

import type { LevelProgress } from "./types";

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

export function xpForLevel(level: number): number {
  const l = Math.max(1, level);
  return 50 * (l - 1) * (l - 1);
}

export function getLevelProgress(xp: number, title?: string | null): LevelProgress {
  const level = levelFromXp(xp);
  const xpForCurrent = xpForLevel(level);
  const xpForNext = xpForLevel(level + 1);
  const span = xpForNext - xpForCurrent;
  const progressPct =
    span > 0 ? Math.min(100, Math.round(((xp - xpForCurrent) / span) * 1000) / 10) : 100;

  return {
    level,
    xp,
    xpForCurrent,
    xpForNext,
    progressPct,
    title: title ?? null,
  };
}

export function titleForLevel(level: number): string {
  if (level >= 50) return "Legend";
  if (level >= 30) return "Scholar";
  if (level >= 20) return "Achiever";
  if (level >= 10) return "Rising Star";
  if (level >= 5) return "Learner";
  return "Beginner";
}
