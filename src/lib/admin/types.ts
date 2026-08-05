/**
 * StudyMind Admin Platform types
 */

export type AdminRole =
  | "super_admin"
  | "administrator"
  | "curriculum_manager"
  | "question_editor"
  | "reviewer"
  | "support_agent"
  | "analyst";

export type Permission =
  | "admin.access"
  | "questions.read"
  | "questions.write"
  | "questions.publish"
  | "questions.delete"
  | "imports.run"
  | "curriculum.write"
  | "users.read"
  | "users.write"
  | "users.support"
  | "analytics.read"
  | "moderation.review"
  | "settings.write"
  | "jobs.manage"
  | "audit.read";

export interface AdminActor {
  userId: string;
  email?: string;
  roles: AdminRole[];
}

export interface AuditEntry {
  id?: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  at: string;
}

export interface AdminDashboard {
  usersTotal: number;
  usersActive7d: number;
  questionsTotal: number;
  questionsActive: number;
  importsRecent: number;
  practiceSessions7d: number;
  examSessions7d: number;
  tutorConversations7d: number;
  flaggedQuestions: number;
  pendingReviews: number;
  recentRegistrations: {
    id: string;
    email: string;
    createdAt: string;
  }[];
  recentImports: {
    id: string;
    fileName: string | null;
    status: string;
    importedCount: number;
    createdAt: string;
  }[];
  alerts: string[];
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  featureFlags: Record<string, boolean>;
  xpDailySoftCap: number;
  defaultExamTimeSec: number;
  defaultPracticeCount: number;
  tutorProvider: string;
  passThresholdPct: number;
}

export interface JobStatus {
  id: string;
  type: string;
  status: "queued" | "running" | "completed" | "failed";
  progress?: number;
  message?: string;
  createdAt: string;
  finishedAt?: string;
}

export interface QuestionAdminFilters {
  curriculumId?: string;
  subjectId?: string;
  topicId?: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface UserAdminFilters {
  q?: string;
  plan?: string;
  onboardingDone?: boolean;
  page?: number;
  pageSize?: number;
}
