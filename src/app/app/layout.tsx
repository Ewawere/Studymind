import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app/BottomNav";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Must be signed in (middleware already enforces this)
  // Must complete onboarding before accessing the app
  if (user && !user.onboardingDone) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 pb-20">
      <main className="mx-auto max-w-lg px-4 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}
