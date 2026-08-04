import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Brain } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-semibold text-white">StudyMind</span>
      </Link>

      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-zinc-900 border border-zinc-800 shadow-xl",
          },
        }}
        routing="path"
        path="/signup"
        signInUrl="/login"
        forceRedirectUrl="/onboarding"
      />
    </div>
  );
}
