import { Settings, LogOut, ChevronRight, Crown } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-semibold text-white">
          J
        </div>
        <div>
          <h1 className="text-lg font-semibold">Justin</h1>
          <p className="text-sm text-zinc-400">WAEC · SS3 · Physics focus</p>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-5 w-5 text-indigo-400" />
          <div>
            <p className="text-sm font-medium">Free plan</p>
            <p className="text-xs text-zinc-400">Upgrade for unlimited AI</p>
          </div>
        </div>
        <button className="rounded-full bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white">
          Upgrade
        </button>
      </div>

      <div className="space-y-1">
        {[
          { label: "Academic profile", href: "#" },
          { label: "Notifications", href: "#" },
          { label: "Appearance", href: "#" },
          { label: "Privacy & data", href: "#" },
          { label: "Help & support", href: "#" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between rounded-xl px-3 py-3.5 hover:bg-zinc-900 transition"
          >
            <span className="text-sm">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </Link>
        ))}
      </div>

      <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 py-3 text-sm text-zinc-400 hover:bg-zinc-900 transition">
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </div>
  );
}
