import { prisma } from "@/lib/prisma";
import type { AdminActor } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

export async function listConcepts(actor: AdminActor, topicId?: string) {
  assertPermission(actor, "questions.read");
  return prisma.concept.findMany({
    where: topicId ? { topicId } : undefined,
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      topic: { select: { name: true } },
      prerequisitesFrom: {
        include: { toConcept: { select: { id: true, name: true } } },
      },
      _count: { select: { questions: true, conceptStates: true } },
    },
  });
}

export async function createConcept(
  actor: AdminActor,
  data: {
    topicId: string;
    name: string;
    description?: string;
    order?: number;
  }
) {
  assertPermission(actor, "curriculum.write");
  const row = await prisma.concept.create({ data });
  await writeAudit(actor, "concept.create", "Concept", row.id);
  return row;
}

export async function updateConcept(
  actor: AdminActor,
  id: string,
  data: Partial<{ name: string; description: string; order: number; isActive: boolean }>
) {
  assertPermission(actor, "curriculum.write");
  const row = await prisma.concept.update({ where: { id }, data });
  await writeAudit(actor, "concept.update", "Concept", id);
  return row;
}

export async function addPrerequisite(
  actor: AdminActor,
  fromConceptId: string,
  toConceptId: string,
  strength = 1
) {
  assertPermission(actor, "curriculum.write");
  // fromConcept requires toConcept (to is prerequisite of from)
  const row = await prisma.conceptRelation.create({
    data: {
      fromConceptId,
      toConceptId,
      relationType: "prerequisite",
      strength,
    },
  });
  await writeAudit(actor, "concept.prerequisite_add", "ConceptRelation", row.id, {
    fromConceptId,
    toConceptId,
  });
  return row;
}

export async function removePrerequisite(actor: AdminActor, relationId: string) {
  assertPermission(actor, "curriculum.write");
  await prisma.conceptRelation.delete({ where: { id: relationId } });
  await writeAudit(actor, "concept.prerequisite_remove", "ConceptRelation", relationId);
}
