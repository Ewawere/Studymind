/**
 * Lightweight global search for admin + in-app.
 * Swap for Typesense/Meilisearch/OpenSearch later without API changes.
 */

import { prisma } from "@/lib/prisma";

export interface SearchHit {
  type: "question" | "user" | "subject" | "topic" | "concept" | "import";
  id: string;
  title: string;
  subtitle?: string;
}

export async function globalSearch(
  q: string,
  opts?: { limit?: number }
): Promise<SearchHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const limit = Math.min(20, opts?.limit ?? 10);

  const [questions, users, subjects, topics, concepts, imports] =
    await Promise.all([
      prisma.question.findMany({
        where: { stem: { contains: term, mode: "insensitive" } },
        take: limit,
        select: { id: true, stem: true, subject: { select: { name: true } } },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: term, mode: "insensitive" } },
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
      prisma.subject.findMany({
        where: { name: { contains: term, mode: "insensitive" } },
        take: limit,
        select: { id: true, name: true, code: true },
      }),
      prisma.topic.findMany({
        where: { name: { contains: term, mode: "insensitive" } },
        take: limit,
        select: { id: true, name: true },
      }),
      prisma.concept.findMany({
        where: { name: { contains: term, mode: "insensitive" } },
        take: limit,
        select: { id: true, name: true },
      }),
      prisma.questionImport.findMany({
        where: { fileName: { contains: term, mode: "insensitive" } },
        take: limit,
        select: { id: true, fileName: true, status: true },
      }),
    ]);

  const hits: SearchHit[] = [
    ...questions.map((q) => ({
      type: "question" as const,
      id: q.id,
      title: q.stem.slice(0, 100),
      subtitle: q.subject.name,
    })),
    ...users.map((u) => ({
      type: "user" as const,
      id: u.id,
      title: u.email,
      subtitle: [u.firstName, u.lastName].filter(Boolean).join(" "),
    })),
    ...subjects.map((s) => ({
      type: "subject" as const,
      id: s.id,
      title: s.name,
      subtitle: s.code,
    })),
    ...topics.map((t) => ({
      type: "topic" as const,
      id: t.id,
      title: t.name,
    })),
    ...concepts.map((c) => ({
      type: "concept" as const,
      id: c.id,
      title: c.name,
    })),
    ...imports.map((i) => ({
      type: "import" as const,
      id: i.id,
      title: i.fileName ?? i.id,
      subtitle: i.status,
    })),
  ];

  return hits.slice(0, limit * 2);
}
