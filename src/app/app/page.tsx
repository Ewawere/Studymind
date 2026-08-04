import { Flame, Target, Clock, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">Good evening</p>
          <h1 className="text-xl font-semibold">Ready to learn?</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-orange-400 text-sm font-medium">
          <Flame className="h-4 w-4" />
          3 day streak
        </div>
      </div>

      {/* Exam countdown card */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">
              Next exam
            </p>
            <h2 className="mt-1 text-lg font-semibold">WAEC Physics</h2>
            <p className="mt-1 text-sm text-zinc-400">42 days remaining</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-indigo-400">42</p>
            <p className="text-xs text-zinc-500">days</p>
          </div>
        </div>
      </div>

      {/* Today's plan */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Today&apos;s plan</h2>
          <Link href="/app/planner" className="text-xs text-indigo-400 hover:text-indigo-300">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {[
            { title: "Thermodynamics review", time: "15 min", type: "Weak topic" },
            { title: "WAEC Physics past questions", time: "20 min", type: "Practice" },
            { title: "Flashcards — Waves", time: "10 min", type: "Spaced" },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                <BookOpen className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-zinc-500">
                  {item.time} · {item.type}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-semibold mb-3">Quick start</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/app/tutor"
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition"
          >
            <Target className="h-5 w-5 text-indigo-400 mb-2" />
            <p className="text-sm font-medium">Ask anything</p>
            <p className="text-xs text-zinc-500 mt-0.5">Get help now</p>
          </Link>
          <Link
            href="/app/practice"
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition"
          >
            <Clock className="h-5 w-5 text-violet-400 mb-2" />
            <p className="text-sm font-medium">Quick quiz</p>
            <p className="text-xs text-zinc-500 mt-0.5">10 questions</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
