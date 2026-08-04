import { LogOut, ChevronRight, Crown } from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  const curriculum = user?.curriculumId
    ? await prisma.curriculum.findUnique({ where: { id: user.curriculumId } })
    : null;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Student";
  const initial = displayName.charAt(0).toUpperCase();

  const subtitle = [
    curriculum?.code,
    user?.level,
    user?.primaryFocus ? `${user.primaryFocus} focus` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-semibold text-white">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{displayName}</h1>
          <p className="text-sm text-zinc-400 truncate">{subtitle || "Complete your profile"}</p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-5 w-5 text-indigo-400" />
          <div>
            <p className="text-sm font-medium">
              {user?.plan === "PRO"
                ? "Pro plan"
                : user?.plan === "EXAM_PASS"
                  ? "Exam Pass"
                  : "Free plan"}
            </p>
            <p className="text-xs text-zinc-400">Upgrade for unlimited AI</p>
          </div>
        </div>
        <button className="rounded-full bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white">
          Upgrade
        </button>
      </div>

      {/* Profile summary */}
      {user?.onboardingDone && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3 text-sm">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Academic profile
          </p>
          <Row label="Country" value={user.country} />
          <Row label="Curriculum" value={curriculum?.code} />
          <Row label="Level" value={user.level} />
          <Row label="Focus" value={user.primaryFocus} />
          <Row
            label="Daily target"
            value={
              user.dailyStudyTargetMin
                ? `${user.dailyStudyTargetMin} min`
                : null
            }
          />
          <Row
            label="Explanation style"
            value={user.preferredExplanationStyle}
          />
          {user.weakSubjects?.length > 0 && (
            <Row label="Weak subjects" value={user.weakSubjects.join(", ")} />
          )}
        </div>
      )}

      <div className="space-y-1">
        <Link
          href="/app/profile/edit"
          className="flex items-center justify-between rounded-xl px-3 py-3.5 hover:bg-zinc-900 transition"
        >
          <span className="text-sm">Edit academic profile</span>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Link>
        <Link
          href="#"
          className="flex items-center justify-between rounded-xl px-3 py-3.5 hover:bg-zinc-900 transition"
        >
          <span className="text-sm">Notifications</span>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Link>
        <Link
          href="#"
          className="flex items-center justify-between rounded-xl px-3 py-3.5 hover:bg-zinc-900 transition"
        >
          <span className="text-sm">Help & support</span>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 text-right">{value}</span>
    </div>
  );
}
