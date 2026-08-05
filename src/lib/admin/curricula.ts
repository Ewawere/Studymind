import { prisma } from "@/lib/prisma";
import type { AdminActor } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

export async function listCurricula(actor: AdminActor) {
  assertPermission(actor, "questions.read");
  return prisma.curriculum.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { subjects: true, questions: true, users: true } },
    },
  });
}

export async function createCurriculum(
  actor: AdminActor,
  data: { code: string; name: string; country?: string; description?: string }
) {
  assertPermission(actor, "curriculum.write");
  const row = await prisma.curriculum.create({ data });
  await writeAudit(actor, "curriculum.create", "Curriculum", row.id);
  return row;
}

export async function updateCurriculum(
  actor: AdminActor,
  id: string,
  data: Partial<{ name: string; country: string; description: string; isActive: boolean }>
) {
  assertPermission(actor, "curriculum.write");
  const row = await prisma.curriculum.update({ where: { id }, data });
  await writeAudit(actor, "curriculum.update", "Curriculum", id);
  return row;
}
