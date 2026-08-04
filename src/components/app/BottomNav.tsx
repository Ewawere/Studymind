"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bot, BookOpen, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/tutor", label: "Tutor", icon: Bot },
  { href: "/app/practice", label: "Practice", icon: BookOpen },
  { href: "/app/planner", label: "Planner", icon: Calendar },
  { href: "/app/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-zinc-800 bg-[#0a0a0b]/95 backdrop-blur-xl safe-area-pb">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition",
                isActive ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
