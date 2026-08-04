/**
 * Format parsers for question import.
 * Architecture allows adding Excel/XML later without changing the pipeline.
 */

import type { QuestionInput, QuestionOptionInput } from "./types";

export function parseJsonQuestions(raw: string): QuestionInput[] {
  const data = JSON.parse(raw);
  const arr = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(arr)) {
    throw new Error("JSON must be an array or { questions: [] }");
  }
  return arr.map(normalizeRecord);
}

/**
 * Minimal CSV parser (handles quoted fields).
 * Expected header row with known column names.
 */
export function parseCsvQuestions(raw: string): QuestionInput[] {
  const rows = parseCsv(raw);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const out: QuestionInput[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.every((c) => !c.trim())) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = (cells[idx] ?? "").trim();
    });
    out.push(normalizeRecord(rec));
  }
  return out;
}

function normalizeRecord(r: Record<string, unknown>): QuestionInput {
  const str = (k: string) => String(r[k] ?? r[k.toLowerCase()] ?? "").trim();
  const num = (k: string) => {
    const v = r[k] ?? r[k.toLowerCase()];
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  // Options: option_a / optionA / options JSON
  let options: QuestionOptionInput[] | undefined;
  if (typeof r.options === "string" && r.options.startsWith("[")) {
    try {
      options = JSON.parse(r.options as string);
    } catch {
      /* ignore */
    }
  } else if (Array.isArray(r.options)) {
    options = r.options as QuestionOptionInput[];
  } else {
    const keys = ["a", "b", "c", "d", "e"];
    const built: QuestionOptionInput[] = [];
    for (const k of keys) {
      const text =
        str(`option_${k}`) ||
        str(`option${k}`) ||
        str(`opt_${k}`) ||
        str(k);
      if (text) built.push({ key: k.toUpperCase(), text });
    }
    if (built.length) options = built;
  }

  const tagsRaw = str("tags") || str("tag");
  const tags = tagsRaw
    ? tagsRaw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
    : undefined;

  const objectivesRaw = str("learning_objectives") || str("learningobjectives");
  const learningObjectives = objectivesRaw
    ? objectivesRaw.split(/[|;]/).map((t) => t.trim()).filter(Boolean)
    : undefined;

  const keywordsRaw = str("keywords");
  const keywords = keywordsRaw
    ? keywordsRaw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
    : undefined;

  let commonMistakes;
  if (typeof r.common_mistakes === "string" && r.common_mistakes.startsWith("[")) {
    try {
      commonMistakes = JSON.parse(r.common_mistakes as string);
    } catch {
      /* ignore */
    }
  } else if (Array.isArray(r.commonMistakes)) {
    commonMistakes = r.commonMistakes;
  }

  return {
    curriculumCode: str("curriculum") || str("curriculumcode") || str("curriculum_code"),
    subjectCode: str("subject") || str("subjectcode") || str("subject_code"),
    topicName: str("topic") || str("topicname") || undefined,
    conceptName: str("concept") || str("conceptname") || undefined,
    type: (str("type") || "MULTIPLE_CHOICE").toUpperCase().replace(/\s+/g, "_") as QuestionInput["type"],
    language: str("language") || "en",
    stem: str("stem") || str("question") || str("text"),
    options,
    correctKey: (str("correct_key") || str("correctkey") || str("answer") || str("correct")).toUpperCase() || undefined,
    authorDifficulty: num("difficulty") ?? num("author_difficulty") ?? 3,
    explanation: str("explanation") || undefined,
    commonMistakes,
    learningObjectives,
    estimatedTimeSec: num("estimated_time_sec") ?? num("time") ?? num("estimatedtimesec"),
    source: str("source") || undefined,
    year: num("year"),
    bloomLevel: str("bloom") || str("bloom_level") || undefined,
    tags,
    keywords,
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
