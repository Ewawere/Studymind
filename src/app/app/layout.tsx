import { BottomNav } from "@/components/app/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 pb-20">
      <main className="mx-auto max-w-lg px-4 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}
