/**
 * Hint level guidance used by prompts and UI.
 */

import type { HintLevel } from "./types";

export const HINT_LEVEL_LABELS: Record<HintLevel, string> = {
  1: "Small clue",
  2: "Point toward the concept",
  3: "Show formula or principle",
  4: "Walk through the solution",
};

export function nextHintLevel(current: HintLevel | undefined): HintLevel {
  if (!current) return 1;
  return Math.min(4, current + 1) as HintLevel;
}

export function hintSystemAddon(level: HintLevel): string {
  switch (level) {
    case 1:
      return "Give only a tiny nudge. Do not name the formula or answer.";
    case 2:
      return "Name the concept or topic the student should recall. Still no full solution.";
    case 3:
      return "State the key principle or formula. Let the student compute the final answer.";
    case 4:
      return "Walk through the full solution step by step, then state the answer.";
  }
}
