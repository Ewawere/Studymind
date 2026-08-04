import { Calendar, Plus } from "lucide-react";

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Planner</h1>
          <p className="text-sm text-zinc-400 mt-1">Your study schedule</p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
          <Calendar className="h-4 w-4" />
          This week
        </div>
        <div className="space-y-3">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-8 text-xs font-medium text-zinc-500">{day}</span>
              <div className="flex-1 h-10 rounded-lg bg-zinc-800/60 flex items-center px-3">
                {i < 3 ? (
                  <span className="text-xs text-zinc-300">Physics · 45 min</span>
                ) : i === 3 ? (
                  <span className="text-xs text-zinc-300">Chemistry · 30 min</span>
                ) : (
                  <span className="text-xs text-zinc-600">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-zinc-500">
        Plans are generated from your exam deadlines and weak topics
      </p>
    </div>
  );
}
