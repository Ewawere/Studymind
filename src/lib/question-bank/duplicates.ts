/**
 * Intelligent duplicate detection.
 * Exact match via stemHash; near-match via token Jaccard similarity.
 */

import type {
  QuestionInput,
  DuplicateMatch,
  DuplicateDetectionOptions,
} from "./types";
import { normalizeStem, hashStem } from "./validation";

export function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeStem(text)
      .split(" ")
      .filter((t) => t.length > 2)
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function optionsFingerprint(
  options?: { key: string; text: string }[]
): string {
  if (!options?.length) return "";
  return options
    .map((o) => `${o.key}:${normalizeStem(o.text)}`)
    .sort()
    .join("|");
}

export interface ExistingQuestionProbe {
  id: string;
  stem: string;
  stemHash: string | null;
  optionsFingerprint?: string;
  explanation?: string | null;
  conceptId?: string | null;
}

/**
 * Compare one candidate against a list of existing questions.
 */
export function detectDuplicates(
  candidate: QuestionInput,
  existing: ExistingQuestionProbe[],
  options: DuplicateDetectionOptions = {}
): DuplicateMatch[] {
  const threshold = options.stemSimilarityThreshold ?? 0.92;
  const matches: DuplicateMatch[] = [];
  const candHash = hashStem(candidate.stem);
  const candTokens = tokenSet(candidate.stem);
  const candOpts = optionsFingerprint(candidate.options);

  for (const ex of existing) {
    // Exact hash match
    if (ex.stemHash && ex.stemHash === candHash) {
      matches.push({
        existingQuestionId: ex.id,
        similarity: 1,
        reason: "identical normalized stem",
      });
      continue;
    }

    const sim = jaccard(candTokens, tokenSet(ex.stem));
    if (sim >= threshold) {
      matches.push({
        existingQuestionId: ex.id,
        similarity: sim,
        reason: `near-identical stem (similarity ${sim.toFixed(2)})`,
      });
      continue;
    }

    if (options.checkOptions && candOpts && ex.optionsFingerprint) {
      if (candOpts === ex.optionsFingerprint && sim >= 0.7) {
        matches.push({
          existingQuestionId: ex.id,
          similarity: sim,
          reason: "identical options with similar stem",
        });
        continue;
      }
    }

    if (
      options.checkExplanation &&
      candidate.explanation &&
      ex.explanation
    ) {
      const expSim = jaccard(
        tokenSet(candidate.explanation),
        tokenSet(ex.explanation)
      );
      if (expSim >= 0.95 && sim >= 0.75) {
        matches.push({
          existingQuestionId: ex.id,
          similarity: Math.max(sim, expSim),
          reason: "near-identical explanation and stem",
        });
      }
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}
