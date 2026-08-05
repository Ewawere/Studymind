/**
 * Idempotent curriculum seed for StudyMind.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WAEC_MATH_TOPICS = [
  "Numbers & Numeration",
  "Algebraic Processes",
  "Indices & Surds",
  "Logarithms",
  "Variation",
  "Functions",
  "Equations & Inequalities",
  "Sequences & Series",
  "Coordinate Geometry",
  "Trigonometry",
  "Mensuration",
  "Geometry",
  "Statistics",
  "Probability",
  "Calculus",
];

const WAEC_ENGLISH_TOPICS = [
  "Lexis & Structure",
  "Vocabulary",
  "Concord",
  "Tenses",
  "Parts of Speech",
  "Comprehension",
  "Summary",
  "Oral English",
  "Registers",
  "Idioms",
  "Figures of Speech",
  "Essay Writing",
];

const MATH_CONCEPTS: Record<string, string[]> = {
  "Indices & Surds": [
    "Laws of Indices",
    "Negative Indices",
    "Fractional Indices",
    "Surds",
    "Simplifying Surds",
    "Rationalising Denominators",
  ],
};

const ENGLISH_CONCEPTS: Record<string, string[]> = {
  Concord: [
    "Subject-Verb Agreement",
    "Collective Nouns",
    "Neither-Nor Agreement",
    "Indefinite Pronouns",
  ],
};

async function upsertTopic(
  subjectId: string,
  name: string,
  order: number
) {
  const existing = await prisma.topic.findFirst({
    where: { subjectId, name },
  });
  if (existing) {
    return prisma.topic.update({
      where: { id: existing.id },
      data: { order, isActive: true },
    });
  }
  return prisma.topic.create({
    data: { subjectId, name, order },
  });
}

async function upsertConcept(
  topicId: string,
  name: string,
  order: number
) {
  const existing = await prisma.concept.findFirst({
    where: { topicId, name },
  });
  if (existing) return existing;
  return prisma.concept.create({
    data: { topicId, name, order },
  });
}

async function main() {
  console.log("Seeding StudyMind taxonomy (idempotent)...");

  const waec = await prisma.curriculum.upsert({
    where: { code: "WAEC" },
    update: { name: "West African Examinations Council", isActive: true },
    create: {
      code: "WAEC",
      name: "West African Examinations Council",
      country: "NG",
      description: "Senior Secondary Certificate Examination (SSCE)",
    },
  });

  const jamb = await prisma.curriculum.upsert({
    where: { code: "JAMB" },
    update: { isActive: true },
    create: {
      code: "JAMB",
      name: "Joint Admissions and Matriculation Board",
      country: "NG",
      description: "Unified Tertiary Matriculation Examination (UTME)",
    },
  });

  const waecSubjects = [
    { code: "MATH", name: "Mathematics", order: 1 },
    { code: "ENG", name: "English Language", order: 2 },
    { code: "PHY", name: "Physics", order: 3 },
    { code: "CHEM", name: "Chemistry", order: 4 },
    { code: "BIO", name: "Biology", order: 5 },
    { code: "ECONS", name: "Economics", order: 6 },
    { code: "GOVT", name: "Government", order: 7 },
    { code: "LIT", name: "Literature in English", order: 8 },
  ];

  for (const s of waecSubjects) {
    await prisma.subject.upsert({
      where: { curriculumId_code: { curriculumId: waec.id, code: s.code } },
      update: { name: s.name, order: s.order, isActive: true },
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
    { code: "MATH", name: "Mathematics", order: 2 },
    { code: "PHY", name: "Physics", order: 3 },
    { code: "CHEM", name: "Chemistry", order: 4 },
    { code: "BIO", name: "Biology", order: 5 },
  ];

  for (const s of jambSubjects) {
    await prisma.subject.upsert({
      where: { curriculumId_code: { curriculumId: jamb.id, code: s.code } },
      update: { name: s.name, order: s.order, isActive: true },
      create: {
        curriculumId: jamb.id,
        code: s.code,
        name: s.name,
        order: s.order,
      },
    });
  }

  const math = await prisma.subject.findFirstOrThrow({
    where: { curriculumId: waec.id, code: "MATH" },
  });
  const eng = await prisma.subject.findFirstOrThrow({
    where: { curriculumId: waec.id, code: "ENG" },
  });

  for (let i = 0; i < WAEC_MATH_TOPICS.length; i++) {
    const topic = await upsertTopic(math.id, WAEC_MATH_TOPICS[i], i + 1);
    const concepts = MATH_CONCEPTS[WAEC_MATH_TOPICS[i]] ?? [];
    for (let j = 0; j < concepts.length; j++) {
      await upsertConcept(topic.id, concepts[j], j + 1);
    }
  }

  for (let i = 0; i < WAEC_ENGLISH_TOPICS.length; i++) {
    const topic = await upsertTopic(eng.id, WAEC_ENGLISH_TOPICS[i], i + 1);
    const concepts = ENGLISH_CONCEPTS[WAEC_ENGLISH_TOPICS[i]] ?? [];
    for (let j = 0; j < concepts.length; j++) {
      await upsertConcept(topic.id, concepts[j], j + 1);
    }
  }

  console.log("✅ Seed complete");
  console.log("  Curricula: WAEC, JAMB");
  console.log(`  WAEC Math topics: ${WAEC_MATH_TOPICS.length}`);
  console.log(`  WAEC English topics: ${WAEC_ENGLISH_TOPICS.length}`);
  console.log("  Concepts seeded for Indices & Surds + Concord");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
