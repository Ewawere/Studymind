/**
 * Import management — wraps Question Bank importer with audit.
 */

import { prisma } from "@/lib/prisma";
import { importQuestions } from "@/lib/question-bank";
import type { AdminActor } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

export async function runImport(
  actor: AdminActor,
  opts: {
    format: "csv" | "json";
    content: string;
    fileName?: string;
  }
) {
  assertPermission(actor, "imports.run");

  const result = await importQuestions(opts.content, {
    format: opts.format,
    importedById: actor.userId,
    fileName: opts.fileName,
  });

  await writeAudit(actor, "import.run", "QuestionImport", result.importId, {
    format: opts.format,
    fileName: opts.fileName,
    imported: result.importedCount,
    duplicates: result.duplicateCount,
    errors: result.errorCount,
  });

  return result;
}

export async function listImports(actor: AdminActor, limit = 50) {
  assertPermission(actor, "imports.run");
  return prisma.questionImport.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      importedBy: { select: { email: true, firstName: true } },
    },
  });
}

export async function getImportReport(actor: AdminActor, importId: string) {
  assertPermission(actor, "imports.run");
  return prisma.questionImport.findUniqueOrThrow({
    where: { id: importId },
    include: {
      questions: {
        select: { id: true, stem: true, status: true },
        take: 100,
      },
    },
  });
}
