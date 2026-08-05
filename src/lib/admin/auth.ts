/**
 * Role-based access control for admin APIs.
 * Map Clerk publicMetadata.roles or a dedicated AdminUser table later.
 */

import type { AdminActor, AdminRole, Permission } from "./types";

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    "admin.access",
    "questions.read",
    "questions.write",
    "questions.publish",
    "questions.delete",
    "imports.run",
    "curriculum.write",
    "users.read",
    "users.write",
    "users.support",
    "analytics.read",
    "moderation.review",
    "settings.write",
    "jobs.manage",
    "audit.read",
  ],
  administrator: [
    "admin.access",
    "questions.read",
    "questions.write",
    "questions.publish",
    "imports.run",
    "curriculum.write",
    "users.read",
    "users.support",
    "analytics.read",
    "moderation.review",
    "jobs.manage",
    "audit.read",
  ],
  curriculum_manager: [
    "admin.access",
    "questions.read",
    "curriculum.write",
    "analytics.read",
  ],
  question_editor: [
    "admin.access",
    "questions.read",
    "questions.write",
    "imports.run",
  ],
  reviewer: [
    "admin.access",
    "questions.read",
    "questions.publish",
    "moderation.review",
  ],
  support_agent: [
    "admin.access",
    "users.read",
    "users.support",
    "analytics.read",
  ],
  analyst: ["admin.access", "analytics.read", "questions.read", "audit.read"],
};

export function permissionsFor(roles: AdminRole[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) set.add(p);
  }
  return set;
}

export function can(actor: AdminActor, permission: Permission): boolean {
  return permissionsFor(actor.roles).has(permission);
}

export function assertPermission(
  actor: AdminActor,
  permission: Permission
): void {
  if (!can(actor, permission)) {
    throw new Error(`Forbidden: requires ${permission}`);
  }
}

/** Bootstrap: env-listed super admin emails */
export function isBootstrapSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export function resolveRoles(
  email?: string | null,
  metadataRoles?: string[]
): AdminRole[] {
  if (isBootstrapSuperAdmin(email)) return ["super_admin"];
  const allowed: AdminRole[] = [
    "super_admin",
    "administrator",
    "curriculum_manager",
    "question_editor",
    "reviewer",
    "support_agent",
    "analyst",
  ];
  return (metadataRoles ?? []).filter((r): r is AdminRole =>
    (allowed as string[]).includes(r)
  );
}
