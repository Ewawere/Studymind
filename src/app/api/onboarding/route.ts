import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      country,
      curriculumCode,
      level,
      primaryFocus,
      stressPoint,
      targetExamDate,
      weakSubjects,
      learningGoals,
      preferredExplanationStyle,
      dailyStudyTargetMin,
      timezone,
    } = body;

    // Resolve curriculum code → id
    let curriculumId: string | null = null;
    if (curriculumCode) {
      const curriculum = await prisma.curriculum.findUnique({
        where: { code: curriculumCode },
      });
      curriculumId = curriculum?.id ?? null;
    }

    // Ensure user exists (webhook may lag)
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
      // Safety net — create minimal record
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@temp.studymind.app`, // will be updated by webhook
        },
      });
    }

    // Update profile
    const updated = await prisma.user.update({
      where: { clerkId: userId },
      data: {
        country: country ?? null,
        curriculumId,
        level: level ?? null,
        primaryFocus: primaryFocus ?? null,
        stressPoint: stressPoint ?? null,
        targetExamDate: targetExamDate ? new Date(targetExamDate) : null,
        weakSubjects: Array.isArray(weakSubjects) ? weakSubjects : [],
        learningGoals: Array.isArray(learningGoals) ? learningGoals : [],
        preferredExplanationStyle: preferredExplanationStyle ?? null,
        dailyStudyTargetMin: dailyStudyTargetMin
          ? Number(dailyStudyTargetMin)
          : null,
        timezone: timezone ?? null,
        onboardingDone: true,
      },
    });

    // Optionally create an ExamDeadline if a target date was provided
    if (targetExamDate && curriculumCode) {
      const existing = await prisma.examDeadline.findFirst({
        where: { userId: updated.id },
      });
      if (!existing) {
        await prisma.examDeadline.create({
          data: {
            userId: updated.id,
            title: `${curriculumCode} Exam`,
            examDate: new Date(targetExamDate),
          },
        });
      }
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("[onboarding]", error);
    return NextResponse.json(
      { error: "Failed to save onboarding" },
      { status: 500 }
    );
  }
}
