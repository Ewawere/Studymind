/**
 * Audit trail — stores as LearningEvent type admin_audit for MVP.
 * Promote to dedicated AuditLog table when volume grows.
 */

import { prisma } from "@/lib/prisma";
import type { AdminActor, AuditEntry } from "./types";

export async function writeAudit(
  actor: AdminActor,
  action: string,
  entityType: string,
  entityId?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  await prisma.learningEvent.create({
    data: {
      userId: actor.userId,
      type: "admin_audit",
      payload: {
        action,
        entityType,
        entityId,
        meta,
        actorEmail: actor.email,
        roles: actor.roles,
      },
    },
  });
}

export async function listAuditLogs(opts?: {
  limit?: number;
  action?: string;
}): Promise<AuditEntry[]> {
  const rows = await prisma.learningEvent.findMany({
    where: {
      type: "admin_audit",
      ...(opts?.action
        ? { payload: { path: ["action"], equals: opts.action } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });

  return rows.map((r) => {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      actorId: r.userId,
      action: String(p.action ?? ""),
      entityType: String(p.entityType ?? ""),
      entityId: p.entityId ? String(p.entityId) : undefined,
      meta: (p.meta as Record<string, unknown>) ?? undefined,
      at: r.createdAt.toISOString(),
    };
  });
}
