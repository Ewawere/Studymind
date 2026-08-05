import { prisma } from "@/lib/prisma";
import type { AdminActor } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

export async function listSubjects(actor: AdminActor, curriculumId?: string) {
  assertPermission(actor, "questions.read");
  return prisma.subject.findMany({
    where: curriculumId ? { curriculumId } : undefined,
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      curriculum: { select: { code: true, name: true } },
      _count: { select: { topics: true, questions: true } },
    },
  });
}

export async function createSubject(
  actor: AdminActor,
  data: {
    curriculumId: string;
    code: string;
    name: string;
    description?: string;
    order?: number;
  }
) {
  assertPermission(actor, "curriculum.write");
  const row = await prisma.subject.create({ data });
  await writeAudit(actor, "subject.create", "Subject", row.id);
  return row;
}

export async function updateSubject(
  actor: AdminActor,
  id: string,
  data: Partial<{ name: string; description: string; order: number; isActive: boolean }>
) {
  assertPermission(actor, "curriculum.write");
  const row = await prisma.subject.update({ where: { id }, data });
  await writeAudit(actor, "subject.update", "Subject", id);
  return row;
}
