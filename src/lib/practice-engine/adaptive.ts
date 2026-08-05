/**
 * Adaptive difficulty helpers
 *
 * Used by challenge mode and live mid-session adjustment.
 */

export function nextTargetDifficulty(
  current: number,
  recentResults: boolean[] // true = correct, most recent last
): number {
  if (recentResults.length < 3) return current;

  const last3 = recentResults.slice(-3);
  const correct = last3.filter(Boolean).length;

  if (correct === 3) return Math.min(5, current + 1);
  if (correct === 0) return Math.max(1, current - 1);
  return current;
}

export function shouldInjectEasierQuestion(
  consecutiveWrong: number
): boolean {
  return consecutiveWrong >= 3;
}
