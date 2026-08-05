/**
 * Explanation styles available to students.
 */

import type { ExplanationStyle } from "./types";

export interface StyleOption {
  id: ExplanationStyle;
  label: string;
  description: string;
}

export const EXPLANATION_STYLES: StyleOption[] = [
  { id: "simple", label: "Simple", description: "Short sentences, everyday words" },
  { id: "beginner", label: "Beginner", description: "Defines every term" },
  { id: "like_im_10", label: "Like I'm 10", description: "Playful and concrete" },
  { id: "teacher", label: "Teacher", description: "Patient classroom style" },
  { id: "professor", label: "Professor", description: "Detailed and rigorous" },
  { id: "best_friend", label: "Best friend", description: "Warm and encouraging" },
  { id: "step_by_step", label: "Step-by-step", description: "Numbered steps only" },
  {
    id: "nigerian_examples",
    label: "Nigerian examples",
    description: "Local, familiar analogies",
  },
  {
    id: "football_analogies",
    label: "Football analogies",
    description: "Explain with the beautiful game",
  },
  {
    id: "anime_analogies",
    label: "Anime analogies",
    description: "Training arcs and power-ups",
  },
  {
    id: "exam_focused",
    label: "Exam-focused",
    description: "What examiners mark",
  },
];

export function isValidStyle(s: string): s is ExplanationStyle {
  return EXPLANATION_STYLES.some((x) => x.id === s);
}
