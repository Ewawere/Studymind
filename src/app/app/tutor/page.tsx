import { Bot, BookOpen, Zap, MessageSquare } from "lucide-react";

export default function TutorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tutor</h1>
        <p className="text-sm text-zinc-400 mt-1">Choose a mode to get started</p>
      </div>

      <div className="space-y-3">
        {[
          {
            icon: MessageSquare,
            title: "Ask Anything",
            desc: "General questions, Learning-Brain aware",
            color: "text-indigo-400 bg-indigo-500/10",
          },
          {
            icon: BookOpen,
            title: "Homework Mode",
            desc: "Step-by-step guided solving",
            color: "text-emerald-400 bg-emerald-500/10",
          },
          {
            icon: Zap,
            title: "Emergency Exam Mode",
            desc: "High-yield review under time pressure",
            color: "text-amber-400 bg-amber-500/10",
          },
        ].map((mode) => (
          <button
            key={mode.title}
            className="w-full flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left hover:border-zinc-700 transition"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${mode.color}`}>
              <mode.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{mode.title}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{mode.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center">
        <Bot className="h-8 w-8 text-zinc-600 mx-auto" />
        <p className="mt-3 text-sm text-zinc-500">
          Select a mode above to start a tutoring session
        </p>
      </div>
    </div>
  );
}
