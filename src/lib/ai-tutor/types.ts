/**
 * StudyMind AI Tutor — shared types
 * Provider-agnostic, curriculum-aware.
 */

export type ExplanationStyle =
  | "simple"
  | "beginner"
  | "like_im_10"
  | "teacher"
  | "professor"
  | "best_friend"
  | "step_by_step"
  | "nigerian_examples"
  | "football_analogies"
  | "anime_analogies"
  | "exam_focused";

export type TutorCapability =
  | "explain_concept"
  | "explain_wrong_answer"
  | "generate_hint"
  | "generate_example"
  | "generate_analogy"
  | "ask_follow_up"
  | "summarize_topic"
  | "recommend_practice"
  | "generate_revision_notes"
  | "generate_flashcards"
  | "generate_mnemonics"
  | "generate_quiz"
  | "generate_study_plan"
  | "free_ask";

export type HintLevel = 1 | 2 | 3 | 4;

export interface TutorRequest {
  userId: string;
  capability: TutorCapability;
  message?: string;
  /** Override user preferred style */
  style?: ExplanationStyle;
  questionId?: string;
  conceptId?: string;
  subjectId?: string;
  topicId?: string;
  sessionId?: string;
  conversationId?: string;
  hintLevel?: HintLevel;
  /** Selected answer when explaining a wrong attempt */
  selectedKey?: string;
  stream?: boolean;
}

export interface TutorStructuredResponse {
  explanation: string | null;
  hint: string | null;
  misconception: string | null;
  confidence: number; // 0–1 model confidence in answer quality
  recommendedPractice: string | null;
  recommendedRevision: string | null;
  followUpQuestion: string | null;
  suggestedDifficulty: number | null; // 1–5
  nextActions: string[];
  /** Raw assistant text (always present) */
  message: string;
  style: ExplanationStyle;
  capability: TutorCapability;
  model?: string;
  tokensUsed?: number;
}

export interface TutorContext {
  // Profile
  userId: string;
  curriculumCode: string | null;
  level: string | null;
  primaryFocus: string | null;
  learningGoals: string[];
  preferredStyle: ExplanationStyle;
  dailyStudyTargetMin: number;
  examDate: Date | null;

  // Learning Brain
  weakConcepts: {
    conceptId: string;
    name?: string;
    mastery: number;
    confidence: number;
    reasons: string[];
  }[];
  strongConcepts: {
    conceptId: string;
    name?: string;
    mastery: number;
  }[];
  examReadiness: number | null;
  currentStreak: number;
  narratives: string[];

  // Question (optional)
  question: {
    id: string;
    stem: string;
    options: { key: string; text: string }[];
    correctKey: string | null;
    explanation: string | null;
    commonMistakes: { mistake: string; why?: string }[];
    learningObjectives: string[];
    difficulty: number;
    bloomLevel: string | null;
    concepts: { id: string; name: string }[];
    prerequisites: { id: string; name: string }[];
  } | null;

  // Practice session (optional)
  session: {
    id: string;
    mode: string;
    score: number | null;
    correctCount: number;
    totalQuestions: number;
    currentIndex: number;
  } | null;

  // Conversation
  conversationId: string | null;
  recentMessages: { role: "user" | "assistant" | "system"; content: string }[];
  activeTopic: string | null;
}

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderGenerateOptions {
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ProviderGenerateResult {
  content: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
}

export interface TutorProvider {
  readonly name: string;
  generate(options: ProviderGenerateOptions): Promise<ProviderGenerateResult>;
  stream?(options: ProviderGenerateOptions): AsyncIterable<string>;
  moderate?(text: string): Promise<{ flagged: boolean; reasons: string[] }>;
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
  sanitized: string;
}
