/**
 * Learning Brain unit tests
 *
 * Run with: npx tsx --test src/lib/learning-brain/__tests__/learning-brain.test.ts
 * (or wire into vitest/jest later)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  calculateTopicMastery,
  applyDecay,
  rollupSubjectMastery,
} from "../mastery";
import {
  deriveQuality,
  scheduleNextReview,
  initialSM2State,
  isDue,
} from "../sm2";
import { detectWeakTopics, recommendNextTopics } from "../recommendations";
import type { ConceptSnapshot } from "../recommendations";
import { calculateExamReadiness } from "../analytics";
import type { UserLearningContext } from "../types";

// ── Mastery ──

describe("calculateTopicMastery", () => {
  it("increases mastery on correct answer", () => {
    const result = calculateTopicMastery({
      previousMastery: 40,
      isCorrect: true,
      difficulty: 3,
    });
    assert.ok(result.masteryScore > 40);
    assert.ok(result.delta > 0);
  });

  it("decreases mastery on incorrect answer", () => {
    const result = calculateTopicMastery({
      previousMastery: 50,
      isCorrect: false,
      difficulty: 2,
    });
    assert.ok(result.masteryScore < 50);
    assert.ok(result.delta < 0);
  });

  it("rewards harder correct answers more", () => {
    const easy = calculateTopicMastery({
      previousMastery: 50,
      isCorrect: true,
      difficulty: 1,
    });
    const hard = calculateTopicMastery({
      previousMastery: 50,
      isCorrect: true,
      difficulty: 5,
    });
    assert.ok(hard.delta > easy.delta);
  });

  it("clamps between 0 and 100", () => {
    const high = calculateTopicMastery({
      previousMastery: 99,
      isCorrect: true,
      difficulty: 5,
    });
    assert.ok(high.masteryScore <= 100);

    const low = calculateTopicMastery({
      previousMastery: 1,
      isCorrect: false,
      difficulty: 1,
    });
    assert.ok(low.masteryScore >= 0);
  });
});

describe("applyDecay", () => {
  it("does not decay within 7 days", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);
    assert.equal(applyDecay(70, recent), 70);
  });

  it("decays after multiple weeks", () => {
    const old = new Date();
    old.setDate(old.getDate() - 21);
    const decayed = applyDecay(70, old);
    assert.ok(decayed < 70);
  });
});

describe("rollupSubjectMastery", () => {
  it("returns weighted average", () => {
    const score = rollupSubjectMastery([
      { masteryScore: 80, attemptCount: 10 },
      { masteryScore: 40, attemptCount: 0 },
    ]);
    assert.ok(score > 40 && score < 80);
  });
});

// ── SM-2 ──

describe("SM-2", () => {
  it("resets on low quality", () => {
    const state = {
      easeFactor: 2.5,
      intervalDays: 10,
      repetitions: 3,
      nextReviewAt: new Date(),
      lastReviewedAt: new Date(),
    };
    const result = scheduleNextReview(state, 1);
    assert.equal(result.repetitions, 0);
    assert.equal(result.intervalDays, 1);
  });

  it("increases interval on good quality", () => {
    const state = initialSM2State();
    const first = scheduleNextReview(state, 4);
    assert.equal(first.repetitions, 1);
    assert.equal(first.intervalDays, 1);

    const second = scheduleNextReview(first, 5);
    assert.equal(second.repetitions, 2);
    assert.equal(second.intervalDays, 6);
  });

  it("deriveQuality maps correctly", () => {
    assert.equal(deriveQuality(false), 1);
    assert.ok(deriveQuality(true) >= 3);
  });

  it("isDue returns true for null nextReviewAt", () => {
    assert.equal(isDue(initialSM2State()), true);
  });
});

// ── Recommendations ──

function mockConcept(
  overrides: Partial<ConceptSnapshot> & { conceptId: string }
): ConceptSnapshot {
  return {
    conceptName: "Test",
    masteryScore: 50,
    attemptCount: 5,
    correctCount: 2,
    sm2: initialSM2State(),
    ...overrides,
  };
}

describe("detectWeakTopics", () => {
  it("flags low mastery concepts", () => {
    const weak = detectWeakTopics([
      mockConcept({ conceptId: "c1", masteryScore: 25, attemptCount: 8, correctCount: 2 }),
      mockConcept({ conceptId: "c2", masteryScore: 90, attemptCount: 10, correctCount: 9 }),
    ]);
    assert.ok(weak.some((w) => w.conceptId === "c1"));
    assert.ok(!weak.some((w) => w.conceptId === "c2"));
  });
});

describe("recommendNextTopics", () => {
  it("returns recommendations ordered by priority", () => {
    const ctx: UserLearningContext = {
      userId: "u1",
      dailyStudyTargetMin: 45,
      weakSubjects: [],
    };
    const recs = recommendNextTopics(
      [
        mockConcept({
          conceptId: "weak",
          masteryScore: 20,
          attemptCount: 6,
          correctCount: 1,
        }),
      ],
      ctx
    );
    assert.ok(recs.length > 0);
    assert.ok(recs[0].priority >= (recs[1]?.priority ?? 0));
  });
});

// ── Exam readiness ──

describe("calculateExamReadiness", () => {
  it("returns a score between 0 and 100", () => {
    const result = calculateExamReadiness({
      concepts: [
        mockConcept({ conceptId: "a", masteryScore: 70, attemptCount: 10, correctCount: 7 }),
      ],
      subjects: [{ subjectId: "s1", mastery: 70, attempted: 10, correct: 7 }],
      currentStreak: 3,
      longestStreak: 5,
      totalAttempted: 10,
      totalCorrect: 7,
      ctx: {
        userId: "u1",
        dailyStudyTargetMin: 45,
        weakSubjects: [],
      },
    });
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.ok(["low", "medium", "high"].includes(result.confidence));
  });
});

console.log("All Learning Brain tests defined.");
