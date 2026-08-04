/**
 * Seed core curriculum data for StudyMind MVP
 * Run with: npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding StudyMind curriculum data...");

  const waec = await prisma.curriculum.upsert({
    where: { code: "WAEC" },
    update: {},
    create: {
      code: "WAEC",
      name: "West African Examinations Council",
      country: "NG",
      description: "Senior Secondary Certificate Examination (SSCE)",
    },
  });

  const jamb = await prisma.curriculum.upsert({
    where: { code: "JAMB" },
    update: {},
    create: {
      code: "JAMB",
      name: "Joint Admissions and Matriculation Board",
      country: "NG",
      description: "Unified Tertiary Matriculation Examination (UTME)",
    },
  });

  const waecSubjects = [
    { code: "PHY", name: "Physics", order: 1 },
    { code: "CHEM", name: "Chemistry", order: 2 },
    { code: "BIO", name: "Biology", order: 3 },
    { code: "MATH", name: "Mathematics", order: 4 },
    { code: "ENG", name: "English Language", order: 5 },
    { code: "ECONS", name: "Economics", order: 6 },
    { code: "GOVT", name: "Government", order: 7 },
    { code: "LIT", name: "Literature in English", order: 8 },
  ];

  for (const s of waecSubjects) {
    await prisma.subject.upsert({
      where: {
        curriculumId_code: { curriculumId: waec.id, code: s.code },
      },
      update: {},
      create: {
        curriculumId: waec.id,
        code: s.code,
        name: s.name,
        order: s.order,
      },
    });
  }

  const jambSubjects = [
    { code: "USE_OF_ENG", name: "Use of English", order: 1 },
    { code: "PHY", name: "Physics", order: 2 },
    { code: "CHEM", name: "Chemistry", order: 3 },
    { code: "BIO", name: "Biology", order: 4 },
    { code: "MATH", name: "Mathematics", order: 5 },
    { code: "ECONS", name: "Economics", order: 6 },
    { code: "GOVT", name: "Government", order: 7 },
    { code: "LIT", name: "Literature in English", order: 8 },
  ];

  for (const s of jambSubjects) {
    await prisma.subject.upsert({
      where: {
        curriculumId_code: { curriculumId: jamb.id, code: s.code },
      },
      update: {},
      create: {
        curriculumId: jamb.id,
        code: s.code,
        name: s.name,
        order: s.order,
      },
    });
  }

  const physics = await prisma.subject.findFirst({
    where: { curriculumId: waec.id, code: "PHY" },
  });

  if (physics) {
    const topics = [
      "Measurement & Units",
      "Motion",
      "Forces",
      "Work, Energy & Power",
      "Waves",
      "Light",
      "Electricity",
      "Magnetism",
      "Modern Physics",
      "Heat & Thermodynamics",
    ];

    for (let i = 0; i < topics.length; i++) {
      await prisma.topic.create({
        data: {
          subjectId: physics.id,
          name: topics[i],
          order: i + 1,
        },
      });
    }
  }

  console.log("✅ Seed complete");
  console.log(`  Curricula: WAEC, JAMB`);
  console.log(`  Subjects seeded for both`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
