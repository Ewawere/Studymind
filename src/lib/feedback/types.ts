/**
 * StudyMind Feedback & Experimentation types
 */

export type BugSeverity = "low" | "medium" | "high" | "critical";
export type BugStatus = "open" | "triaged" | "in_progress" | "resolved" | "wont_fix";

export interface BugReportInput {
  userId?: string;
  title: string;
  description: string;
  severity?: BugSeverity;
  page?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

export interface FeatureFeedbackInput {
  userId?: string;
  feature: string;
  rating?: number; // 1–5
  comment?: string;
  wouldRecommend?: boolean;
  meta?: Record<string, unknown>;
}

export interface NpsResponse {
  userId: string;
  score: number; // 0–10
  comment?: string;
  cohort?: string;
}

export interface SurveyResponse {
  userId?: string;
  surveyId: string;
  answers: Record<string, string | number | boolean | string[]>;
}

export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

export interface ExperimentDef {
  key: string;
  name: string;
  description?: string;
  variants: string[]; // e.g. ["control", "treatment"]
  trafficPct?: number; // 0–100, default 100
  status?: ExperimentStatus;
}

export interface ExperimentAssignment {
  experimentKey: string;
  userId: string;
  variant: string;
  assignedAt: string;
}
