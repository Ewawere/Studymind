import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Already finished onboarding → go to app
  if (user?.onboardingDone) {
    redirect("/app");
  }

  return <>{children}</>;
}
