/**
 * StudyMind Gamification types
 */

export type XPSource =
  | "answer_correct"
  | "answer_incorrect"
  | "session_complete"
  | "exam_complete"
  | "perfect_session"
  | "streak_daily"
  | "concept_mastered"
  | "sm2_review"
  | "tutor_lesson"
  | "challenge"
  | "achievement";

export interface XPAward {
  amount: number;
  source: XPSource;
  reason: string;
  leveledUp: boolean;
  newXp: number;
  newLevel: number;
  notifications: GamificationNotification[];
}

export interface LevelProgress {
  level: number;
  xp: number;
  xpForCurrent: number;
  xpForNext: number;
  progressPct: number;
  title: string | null;
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  maintainedToday: boolean;
}

export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  xpReward: number;
  category: "milestone" | "streak" | "mastery" | "exam" | "social" | "special";
}

export interface BadgeDef {
  code: string;
  title: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "legend";
  description: string;
}

export interface ChallengeDef {
  code: string;
  title: string;
  description: string;
  period: "daily" | "weekly" | "monthly";
  target: number;
  metric: "questions" | "minutes" | "sessions" | "reviews" | "accuracy_gain" | "xp";
  xpReward: number;
}

export interface UserChallengeView {
  code: string;
  title: string;
  description: string;
  period: string;
  periodKey: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  xpReward: number;
}

export interface GamificationNotification {
  type:
    | "level_up"
    | "achievement"
    | "badge"
    | "challenge_complete"
    | "streak"
    | "reward";
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  rank: number;
}
