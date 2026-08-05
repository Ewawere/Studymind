/**
 * Phase 3 performance targets and measurement helpers.
 */

import { PERFORMANCE_TARGETS } from "./types";
import { observeLatency, log } from "@/lib/platform";

export { PERFORMANCE_TARGETS };

export async function measureAgainstSlo<T>(
  operation:
    | "dashboard"
    | "question_search"
    | "next_question"
    | "ai_context"
    | "practice_answer",
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const ms = Date.now() - start;
    observeLatency(`perf.${operation}`, ms);

    const target =
      operation === "dashboard"
        ? PERFORMANCE_TARGETS.dashboardMs
        : operation === "question_search"
          ? PERFORMANCE_TARGETS.questionSearchMs
          : operation === "next_question"
            ? PERFORMANCE_TARGETS.nextQuestionSelectionMs
            : operation === "ai_context"
              ? PERFORMANCE_TARGETS.aiContextBuildMs
              : PERFORMANCE_TARGETS.practiceAnswerProcessingMs;

    if (ms > target) {
      log.warn("perf.slo_miss", { operation, ms, target });
    }
  }
}

export function performanceChecklist() {
  return [
    {
      operation: "Dashboard",
      target: `<${PERFORMANCE_TARGETS.dashboardMs} ms`,
    },
    {
      operation: "Question search",
      target: `<${PERFORMANCE_TARGETS.questionSearchMs} ms`,
    },
    {
      operation: "Next question selection",
      target: `<${PERFORMANCE_TARGETS.nextQuestionSelectionMs} ms`,
    },
    {
      operation: "AI context build",
      target: `<${PERFORMANCE_TARGETS.aiContextBuildMs} ms`,
    },
    {
      operation: "Practice answer processing",
      target: `<${PERFORMANCE_TARGETS.practiceAnswerProcessingMs} ms (excluding AI)`,
    },
    {
      operation: "Question import",
      target: `≥${PERFORMANCE_TARGETS.questionImportPerHour.toLocaleString()} questions/hour`,
    },
    {
      operation: "Concurrent users",
      target: `Initial target: ${PERFORMANCE_TARGETS.concurrentUsersInitial.toLocaleString()}+`,
    },
  ];
}
