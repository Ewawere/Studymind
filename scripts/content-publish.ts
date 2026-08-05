/**
 * Publish a content release.
 *
 * Usage:
 *   npx tsx scripts/content-publish.ts 1.0.0
 *   npm run content:publish -- 1.0.0
 */

import { PrismaClient } from "@prisma/client";
import {
  findReleaseByVersion,
  setReleaseStatus,
} from "../src/lib/content";
import { publish, invalidate } from "../src/lib/platform";

const prisma = new PrismaClient();

async function main() {
  const version = process.argv[2];
  if (!version) {
    console.error("Usage: content-publish <version>");
    process.exit(1);
  }

  const release = await findReleaseByVersion(version);
  if (!release) {
    console.error(`Release ${version} not found`);
    process.exit(1);
  }

  if (release.status === "published") {
    console.log(`Release ${version} is already published.`);
    process.exit(0);
  }

  const actor =
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.user.upsert({
      where: { email: "system@studymind.local" },
      update: {},
      create: {
        clerkId: "system_cli",
        email: "system@studymind.local",
        firstName: "System",
        onboardingDone: true,
      },
    }));

  // Activate all questions linked to this release
  const event = await prisma.learningEvent.findUniqueOrThrow({
    where: { id: release.id },
  });
  const payload = (event.payload ?? {}) as { questionIds?: string[] };
  const ids = payload.questionIds ?? [];

  if (ids.length) {
    await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { status: "ACTIVE", isActive: true },
    });
  }

  await setReleaseStatus(version, "published", actor.id);

  invalidate("questions:");
  invalidate("coverage:");

  await publish("ContentReleasePublished" as never, actor.id, {
    version,
    questionCount: ids.length,
  }).catch(() => undefined);

  // fallback audit event if domain type not registered
  await prisma.learningEvent.create({
    data: {
      userId: actor.id,
      type: "content_release_published",
      payload: { version, questionCount: ids.length },
    },
  });

  console.log(`\n✓ Published release ${version}`);
  console.log(`  questions activated: ${ids.length}`);
  console.log(`  caches invalidated\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
