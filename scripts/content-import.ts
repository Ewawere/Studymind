/**
 * Import authored content packs into Question Bank.
 *
 * Usage:
 *   npx tsx scripts/content-import.ts content/v1.0.0/mathematics-indices-surds.json --release=1.0.0
 *   npm run content:import -- content/v1.0.0/english-concord.json --release=1.0.0
 */

import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { importQuestions } from "../src/lib/question-bank";
import {
  validateQuestionAuthoring,
  toImportRow,
  createRelease,
  findReleaseByVersion,
  attachImportToRelease,
  type QuestionAuthoringPayload,
} from "../src/lib/content";

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const file = argv.find((a) => !a.startsWith("--"));
  const releaseArg = argv.find((a) => a.startsWith("--release="));
  const actorArg = argv.find((a) => a.startsWith("--actor="));
  return {
    file,
    release: releaseArg?.split("=")[1],
    actorId: actorArg?.split("=")[1],
  };
}

async function resolveActorId(explicit?: string) {
  if (explicit) return explicit;
  const admin = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (admin) return admin.id;
  // bootstrap system user for CLI when no users exist yet
  const system = await prisma.user.upsert({
    where: { email: "system@studymind.local" },
    update: {},
    create: {
      clerkId: "system_cli",
      email: "system@studymind.local",
      firstName: "System",
      onboardingDone: true,
    },
  });
  return system.id;
}

async function main() {
  const { file, release, actorId: actorArg } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error(
      "Usage: content-import <path-to-json> --release=1.0.0 [--actor=userId]"
    );
    process.exit(1);
  }

  const abs = path.resolve(file);
  const raw = JSON.parse(readFileSync(abs, "utf8")) as {
    release?: string;
    questions: QuestionAuthoringPayload[];
  };

  const version = release ?? raw.release ?? "1.0.0";
  const actorId = await resolveActorId(actorArg);
  const questions = raw.questions ?? [];

  console.log(`\nContent import`);
  console.log(`  file:    ${abs}`);
  console.log(`  release: ${version}`);
  console.log(`  rows:    ${questions.length}\n`);

  // 1. Validate
  let blocked = 0;
  for (let i = 0; i < questions.length; i++) {
    const qa = validateQuestionAuthoring(questions[i]);
    if (!qa.ok) {
      blocked++;
      console.error(`  ✗ row ${i + 1}:`, qa.errors.map((e) => e.message).join("; "));
    } else if (qa.warnings.length) {
      console.warn(
        `  ⚠ row ${i + 1}:`,
        qa.warnings.map((w) => w.message).join("; ")
      );
    }
  }
  if (blocked > 0) {
    console.error(`\nAborted: ${blocked} question(s) failed QA validation.`);
    process.exit(1);
  }
  console.log("  ✓ authoring validation passed");

  // 2. Ensure release exists
  let rel = await findReleaseByVersion(version);
  if (!rel) {
    rel = await createRelease(
      {
        version,
        curriculumCodes: ["WAEC"],
        subjectCodes: ["Mathematics", "English Language", "English"],
        notes: `Auto-created during import of ${path.basename(abs)}`,
      },
      actorId
    );
    console.log(`  ✓ created release ${version}`);
  }

  // 3. Normalize → Question Bank import format (JSON array)
  const importRows = questions.map((q) => toImportRow(q));
  // Map subject names to codes expected by importer
  const normalized = importRows.map((r) => ({
    ...r,
    subjectCode:
      r.subjectCode === "Mathematics"
        ? "MATH"
        : r.subjectCode === "English Language" || r.subjectCode === "English"
          ? "ENG"
          : r.subjectCode,
  }));

  // 4. Import
  const report = await importQuestions(JSON.stringify(normalized), {
    format: "json",
    fileName: path.basename(abs),
    importedById: actorId,
  });

  console.log(`  ✓ imported:   ${report.importedCount}`);
  console.log(`  • duplicates: ${report.duplicateCount}`);
  console.log(`  • errors:     ${report.errorCount}`);

  // 5. Attach to release
  if (report.importId) {
    await attachImportToRelease(version, report.importId);
    console.log(`  ✓ attached to release ${version}`);
  }

  console.log(`\nReady for QA: npm run content:qa ${version}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
