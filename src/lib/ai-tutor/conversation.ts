/**
 * Conversation persistence + light compression for long threads.
 */

import { prisma } from "@/lib/prisma";

const MAX_STORED_MESSAGES = 40;
const KEEP_RECENT = 16;

export async function getOrCreateConversation(opts: {
  userId: string;
  conversationId?: string | null;
  mode?: string;
  subjectId?: string | null;
  title?: string;
}): Promise<string> {
  if (opts.conversationId) {
    const existing = await prisma.conversation.findFirst({
      where: { id: opts.conversationId, userId: opts.userId },
    });
    if (existing) return existing.id;
  }

  const created = await prisma.conversation.create({
    data: {
      userId: opts.userId,
      mode: opts.mode ?? "ask",
      subjectId: opts.subjectId ?? null,
      title: opts.title ?? "Tutor chat",
    },
  });
  return created.id;
}

export async function appendMessage(opts: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  tokensUsed?: number;
}) {
  await prisma.message.create({
    data: {
      conversationId: opts.conversationId,
      role: opts.role,
      content: opts.content,
      model: opts.model,
      tokensUsed: opts.tokensUsed,
    },
  });

  await prisma.conversation.update({
    where: { id: opts.conversationId },
    data: { updatedAt: new Date() },
  });

  await compressIfNeeded(opts.conversationId);
}

/**
 * If a conversation grows too long, fold older messages into a single
 * system summary so prompts stay bounded.
 */
async function compressIfNeeded(conversationId: string) {
  const count = await prisma.message.count({ where: { conversationId } });
  if (count <= MAX_STORED_MESSAGES) return;

  const oldest = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: count - KEEP_RECENT,
  });

  if (oldest.length === 0) return;

  const summary = oldest
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join("\n")
    .slice(0, 1500);

  await prisma.message.deleteMany({
    where: { id: { in: oldest.map((m) => m.id) } },
  });

  await prisma.message.create({
    data: {
      conversationId,
      role: "system",
      content: `[Earlier conversation summary]\n${summary}`,
    },
  });
}
