import { Layers, HelpCircle, Target } from "lucide-react";

export default function PracticePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Practice</h1>
        <p className="text-sm text-zinc-400 mt-1">Quizzes, flashcards & more</p>
      </div>

      <div className="grid gap-3">
        {[
          {
            icon: HelpCircle,
            title: "Quiz Generator",
            desc: "Adaptive difficulty based on your mastery",
            badge: "ELO",
          },
          {
            icon: Layers,
            title: "Flashcards",
            desc: "Spaced repetition · 12 due today",
            badge: "12 due",
          },
          {
            icon: Target,
            title: "Weak Topics",
            desc: "Focus on what needs the most work",
            badge: "3 topics",
          },
        ].map((item) => (
          <button
            key={item.title}
            className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left hover:border-zinc-700 transition"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800">
              <item.icon className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{item.title}</p>
                <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                  {item.badge}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-0.5">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
