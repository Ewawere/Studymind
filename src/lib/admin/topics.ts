import { prisma } from "@/lib/prisma";
import type { AdminActor } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

export async function listTopics(actor: AdminActor, subjectId?: string) {
  assertPermission(actor, "questions.read");
  return prisma.topic.findMany({
    where: subjectId ? { subjectId } : undefined,
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      subject: { select: { name: true, code: true } },
      _count: { select: { concepts: true, questions: true } },
    },
  });
}

export async function createTopic(
  actor: AdminActor,
  data: {
    subjectId: string;
    name: string;
    description?: string;
    order?: number;
  }
) {
  assertPermission(actor, "curriculum.write");
  const row = await prisma.topic.create({ data });
  await writeAudit(actor, "topic.create", "Topic", row.id);
  return row;
}

export async function updateTopic(
  actor: AdminActor,
  id: string,
  data: Partial<{ name: string; description: string; order: number; isActive: boolean }>
) {
  assertPermission(actor, "curriculum.write");
  const row = await prisma.topic.update({ where: { id }, data });
  await writeAudit(actor, "topic.update", "Topic", id);
  return row;
}
