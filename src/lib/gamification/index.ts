/**
 * StudyMind Gamification & Motivation
 *
 * @example
 * import {
 *   registerGamificationListeners,
 *   awardXP,
 *   getAchievements,
 *   generateDailyChallenges,
 * } from "@/lib/gamification";
 *
 * registerGamificationListeners(); // once at startup
 */

export * from "./types";

export {
  awardXP,
  calculateXP,
  calculateAnswerXp,
  calculateSessionBonus,
  calculateExamBonus,
} from "./xp";

export {
  levelFromXp,
  xpForLevel,
  getLevelProgress,
  titleForLevel,
} from "./levels";

export { getStreak, updateStreak, resetStreak } from "./streaks";

export {
  ACHIEVEMENT_CATALOG,
  getAchievements,
  unlockAchievement,
  evaluateAchievements,
} from "./achievements";

export {
  BADGE_CATALOG,
  getBadges,
  unlockBadge,
  evaluateBadges,
} from "./badges";

export {
  CHALLENGE_CATALOG,
  generateDailyChallenges,
  progressChallenge,
  completeChallenge,
} from "./challenges";

export { claimReward } from "./rewards";
export { getLeaderboard } from "./leaderboard";
export { registerGamificationListeners } from "./events";

/** Convenience aliases matching the Module 8 public API */
export { getLevelProgress as getLevel } from "./levels";
export { getLevelProgress as getProgressToNextLevel } from "./levels";
