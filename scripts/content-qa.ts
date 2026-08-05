/**
 * QA summary for a content release.
 *
 * Usage:
 *   npx tsx scripts/content-qa.ts 1.0.0
 *   npm run content:qa -- 1.0.0
 */

import { PrismaClient } from "@prisma/client";
import { findReleaseByVersion } from "../src/lib/content";

const prisma = new PrismaClient();

async function main() {
  const version = process.argv[2];
  if (!version) {
    console.error("Usage: content-qa <version>");
    process.exit(1);
  }

  const release = await findReleaseByVersion(version);
  if (!release) {
    console.error(`Release ${version} not found`);
    process.exit(1);
  }

  const event = await prisma.learningEvent.findUniqueOrThrow({
    where: { id: release.id },
  });
  const payload = (event.payload ?? {}) as {
    questionIds?: string[];
    importIds?: string[];
  };
  const questionIds = payload.questionIds ?? [];

  const questions =
    questionIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: questionIds } },
          include: { options: true },
        })
      : [];

  let missingExplanation = 0;
  let missingMisconception = 0;
  let missingBloom = 0;
  let missingObjective = 0;
  let missingOptions = 0;

  for (const q of questions) {
    if (!q.explanation || q.explanation.length < 20) missingExplanation++;
    const mistakes = q.commonMistakes as unknown;
    if (
      !mistakes ||
      (Array.isArray(mistakes) && mistakes.length === 0) ||
      (typeof mistakes === "object" &&
        !Array.isArray(mistakes) &&
        Object.keys(mistakes as object).length === 0)
    ) {
      missingMisconception++;
    }
    if (!q.bloomLevel) missingBloom++;
    if (!q.learningObjectives?.length) missingObjective++;
    if (q.options.length < 2) missingOptions++;
  }

  const checks = [
    { ok: questions.length > 0, label: `Questions: ${questions.length}` },
    {
      ok: missingExplanation === 0,
      label:
        missingExplanation === 0
          ? "All explanations present"
          : `${missingExplanation} missing explanations`,
    },
    {
      ok: missingMisconception === 0,
      label:
        missingMisconception === 0
          ? "Misconceptions present"
          : `${missingMisconception} missing misconceptions`,
    },
    {
      ok: missingBloom === 0,
      label:
        missingBloom === 0
          ? "Bloom levels assigned"
          : `${missingBloom} missing Bloom levels`,
    },
    {
      ok: missingObjective === 0,
      label:
        missingObjective === 0
          ? "Learning objectives present"
          : `${missingObjective} missing objectives`,
    },
    {
      ok: missingOptions === 0,
      label:
        missingOptions === 0
          ? "Options complete"
          : `${missingOptions} questions with incomplete options`,
    },
    {
      ok: release.status !== "published",
      label: `Status: ${release.status}`,
    },
  ];

  console.log(`\nRelease ${version}`);
  for (const c of checks) {
    console.log(`  ${c.ok ? "✓" : "✗"} ${c.label}`);
  }

  const ready = checks.slice(0, -1).every((c) => c.ok);
  console.log(
    ready
      ? `\n✓ Ready for Review → npm run content:publish ${version}\n`
      : `\n✗ Fix issues before publish\n`
  );
  process.exit(ready ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
