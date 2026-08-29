/**
 * Import pipeline:
 * 1. Parse  2. Validate  3. Normalize  4. Detect duplicates
 * 5. Resolve taxonomy refs  6. Insert transactionally  7. Report
 */

import { prisma } from "@/lib/prisma";
import type {
  QuestionInput,
  ImportReport,
  ImportRowResult,
  DuplicateDetectionOptions,
} from "./types";
import { validateQuestion, hashStem } from "./validation";
import {
  detectDuplicates,
  optionsFingerprint,
  type ExistingQuestionProbe,
} from "./duplicates";
import { parseCsvQuestions, parseJsonQuestions } from "./parse";
import type { Prisma } from "@prisma/client";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export interface ImportOptions {
  format: "csv" | "json";
  fileName?: string;
  importedById?: string;
  skipDuplicates?: boolean; // default true — flag & skip
  duplicateOptions?: DuplicateDetectionOptions;
  batchSize?: number;
}

export async function importQuestions(
  raw: string,
  options: ImportOptions
): Promise<ImportReport> {
  const items =
    options.format === "csv" ? parseCsvQuestions(raw) : parseJsonQuestions(raw);

  const importRecord = await prisma.questionImport.create({
    data: {
      sourceFormat: options.format,
      fileName: options.fileName,
      importedById: options.importedById,
      status: "pending",
    },
  });

  // Load existing probes for duplicate detection (scoped by curricula present)
  const curriculumCodes = [
    ...new Set(items.map((i) => i.curriculumCode).filter(Boolean)),
  ];
  const curricula = await prisma.curriculum.findMany({
    where: { code: { in: curriculumCodes } },
  });
  const curriculumIds = curricula.map((c) => c.id);

  const existingQs = await prisma.question.findMany({
    where: { curriculumId: { in: curriculumIds }, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      stem: true,
      stemHash: true,
      conceptId: true,
      explanation: true,
      options: { select: { key: true, text: true } },
    },
    take: 50000, // safety bound; shard further for huge banks
  });

  const probes: ExistingQuestionProbe[] = existingQs.map((q) => ({
    id: q.id,
    stem: q.stem,
    stemHash: q.stemHash,
    explanation: q.explanation,
    conceptId: q.conceptId,
    optionsFingerprint: optionsFingerprint(q.options),
  }));

  const curriculumByCode = new Map(curricula.map((c) => [c.code, c]));
  const subjects = await prisma.subject.findMany({
    where: { curriculumId: { in: curriculumIds } },
  });
  const subjectKey = (curriculumId: string, code: string) =>
    `${curriculumId}:${code}`;
  const subjectByKey = new Map(
    subjects.map((s) => [subjectKey(s.curriculumId, s.code), s])
  );

  const rows: ImportRowResult[] = [];
  let importedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const skipDup = options.skipDuplicates !== false;

  for (let i = 0; i < items.length; i++) {
    const input = items[i];
    const rowNum = i + 1;
    const validation = validateQuestion(input, rowNum);

    if (!validation.valid) {
      errorCount++;
      rows.push({
        row: rowNum,
        status: "error",
        errors: validation.errors,
        warnings: validation.warnings,
      });
      continue;
    }

    const curriculum = curriculumByCode.get(input.curriculumCode);
    if (!curriculum) {
      errorCount++;
      rows.push({
        row: rowNum,
        status: "error",
        errors: [
          {
            field: "curriculumCode",
            message: `Unknown curriculum: ${input.curriculumCode}`,
            row: rowNum,
          },
        ],
      });
      continue;
    }

    const subject = subjectByKey.get(
      subjectKey(curriculum.id, input.subjectCode)
    );
    if (!subject) {
      errorCount++;
      rows.push({
        row: rowNum,
        status: "error",
        errors: [
          {
            field: "subjectCode",
            message: `Unknown subject: ${input.subjectCode} in ${input.curriculumCode}`,
            row: rowNum,
          },
        ],
      });
      continue;
    }

    // Resolve topic / concept (create if missing — optional auto-provision)
    let topicId: string | null = null;
    let conceptId: string | null = null;

    if (input.topicName) {
      let topic = await prisma.topic.findFirst({
        where: { subjectId: subject.id, name: input.topicName },
      });
      if (!topic) {
        topic = await prisma.topic.create({
          data: { subjectId: subject.id, name: input.topicName },
        });
      }
      topicId = topic.id;

      if (input.conceptName) {
        let concept = await prisma.concept.findFirst({
          where: { topicId: topic.id, name: input.conceptName },
        });
        if (!concept) {
          concept = await prisma.concept.create({
            data: { topicId: topic.id, name: input.conceptName },
          });
        }
        conceptId = concept.id;
      }
    }

    const dups = detectDuplicates(input, probes, options.duplicateOptions);
    if (dups.length > 0 && skipDup) {
      duplicateCount++;
      rows.push({
        row: rowNum,
        status: "duplicate",
        duplicates: dups,
        warnings: validation.warnings,
      });
      continue;
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const q = await tx.question.create({
          data: {
            curriculumId: curriculum.id,
            subjectId: subject.id,
            topicId,
            conceptId,
            type: (input.type as "MULTIPLE_CHOICE") ?? "MULTIPLE_CHOICE",
            language: input.language ?? "en",
            stem: input.stem.trim(),
            stemHash: hashStem(input.stem),
            correctKey: input.correctKey ?? null,
            authorDifficulty: input.authorDifficulty ?? 3,
            explanation: input.explanation ?? null,
            commonMistakes: input.commonMistakes
              ? toJson(input.commonMistakes)
              : undefined,
            learningObjectives: input.learningObjectives ?? [],
            estimatedTimeSec: input.estimatedTimeSec ?? null,
            source: input.source ?? null,
            year: input.year ?? null,
            bloomLevel: input.bloomLevel
              ? String(input.bloomLevel).toLowerCase()
              : null,
            keywords: input.keywords ?? [],
            importId: importRecord.id,
            options: input.options
              ? {
                  create: input.options.map((o, idx) => ({
                    key: o.key,
                    text: o.text,
                    order: idx,
                    isCorrect: o.key === input.correctKey || !!o.isCorrect,
                  })),
                }
              : undefined,
            statistics: { create: {} },
            revisions: {
              create: {
                revisionNumber: 1,
                snapshot: toJson(input),
                changeNote: "Initial import",
              },
            },
          },
        });

        // Tags
        if (input.tags?.length) {
          for (const tagName of input.tags) {
            const slug = tagName.toLowerCase().replace(/\s+/g, "-");
            const tag = await tx.tag.upsert({
              where: { slug },
              create: { name: tagName, slug },
              update: {},
            });
            await tx.questionTag.create({
              data: { questionId: q.id, tagId: tag.id },
            });
          }
        }

        // Multi-concept mapping
        if (conceptId) {
          await tx.questionConcept.create({
            data: {
              questionId: q.id,
              conceptId,
              role: "primary",
            },
          });
        }

        // Media
        if (input.media?.length) {
          await tx.questionMedia.createMany({
            data: input.media.map((m, idx) => ({
              questionId: q.id,
              type: m.type,
              url: m.url,
              altText: m.altText,
              order: m.order ?? idx,
              metadata: m.metadata != null ? toJson(m.metadata) : undefined,
            })),
          });
        }

        return q;
      });

      // Add to probes so later rows in same batch can detect dups
      probes.push({
        id: created.id,
        stem: created.stem,
        stemHash: created.stemHash,
        conceptId: created.conceptId,
        explanation: created.explanation,
        optionsFingerprint: optionsFingerprint(input.options),
      });

      importedCount++;
      rows.push({
        row: rowNum,
        status: "imported",
        questionId: created.id,
        warnings: validation.warnings,
        duplicates: dups.length ? dups : undefined,
      });
    } catch (err) {
      errorCount++;
      rows.push({
        row: rowNum,
        status: "error",
        errors: [
          {
            field: "_",
            message: err instanceof Error ? err.message : "Insert failed",
            row: rowNum,
          },
        ],
      });
    }
  }

  const report: ImportReport = {
    importId: importRecord.id,
    sourceFormat: options.format,
    fileName: options.fileName,
    importedCount,
    skippedCount,
    duplicateCount,
    errorCount,
    rows,
    warnings: [],
  };

  await prisma.questionImport.update({
    where: { id: importRecord.id },
    data: {
      status: "completed",
      importedCount,
      skippedCount,
      duplicateCount,
      errorCount,
      report: toJson(report),
    },
  });

  return report;
}
