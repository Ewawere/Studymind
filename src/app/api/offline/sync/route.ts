import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Accepts offline-queued mutations from the client.
 * Body: { type, payload, clientId, createdAt }
 */
export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    type?: string;
    payload?: Record<string, unknown>;
    clientId?: string;
  };

  if (!body.type || !body.payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Idempotency: skip if we already recorded this client mutation id
  if (body.clientId) {
    const existing = await prisma.learningEvent.findFirst({
      where: {
        userId: user.id,
        type: "offline_sync",
        payload: { path: ["clientId"], equals: body.clientId },
      },
    });
    if (existing) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  }

  if (body.type === "answer_submitted") {
    const p = body.payload;
    const questionId = String(p.questionId ?? "");
    const selectedKey =
      p.selectedKey == null ? null : String(p.selectedKey);
    const isCorrect = Boolean(p.isCorrect);
    const timeSpentMs =
      typeof p.timeSpentMs === "number" ? p.timeSpentMs : undefined;
    const quizAttemptId = p.sessionId ? String(p.sessionId) : undefined;

    if (questionId) {
      // Only create if not already present for this session+question
      const dup = quizAttemptId
        ? await prisma.questionAttempt.findFirst({
            where: {
              userId: user.id,
              questionId,
              quizAttemptId,
            },
          })
        : null;

      if (!dup) {
        await prisma.questionAttempt.create({
          data: {
            userId: user.id,
            questionId,
            quizAttemptId,
            selectedKey,
            isCorrect,
            timeSpentMs,
          },
        });
      }
    }
  }

  if (body.type === "session_completed") {
    const sessionId = String(body.payload.sessionId ?? "");
    if (sessionId) {
      await prisma.quizAttempt
        .update({
          where: { id: sessionId },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }
  }

  if (body.type === "session_progress") {
    const sessionId = String(body.payload.sessionId ?? "");
    const currentIndex =
      typeof body.payload.currentIndex === "number"
        ? body.payload.currentIndex
        : undefined;
    if (sessionId && currentIndex != null) {
      await prisma.quizAttempt
        .update({
          where: { id: sessionId },
          data: { currentIndex },
        })
        .catch(() => undefined);
    }
  }

  await prisma.learningEvent.create({
    data: {
      userId: user.id,
      type: "offline_sync",
      payload: {
        clientId: body.clientId,
        mutationType: body.type,
        payload: body.payload,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
