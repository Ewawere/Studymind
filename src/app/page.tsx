import Link from "next/link";
import {
  Brain,
  BookOpen,
  Zap,
  Target,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Users,
  Shield,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-zinc-800/60 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">StudyMind</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-zinc-400 hover:text-white transition sm:block">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Built for WAEC & JAMB students first
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl mx-auto leading-[1.1]">
            The AI tutor that{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              gets smarter about you
            </span>{" "}
            every day
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400 leading-relaxed">
            Not another chat wrapper. StudyMind adapts to your curriculum, tracks what you
            actually know, and helps you master WAEC, JAMB and beyond — one focused session
            at a time.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-indigo-500 px-7 py-3.5 text-base font-medium text-white hover:bg-indigo-400 transition shadow-lg shadow-indigo-500/25"
            >
              Start learning free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-7 py-3.5 text-base font-medium text-zinc-300 hover:bg-zinc-900 transition"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            Free tier available · No credit card required · Regional pricing
          </p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-zinc-800/60 bg-zinc-900/30 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Built for African students</div>
          <div className="flex items-center gap-2"><Target className="h-4 w-4" /> Curriculum-aware (WAEC · JAMB)</div>
          <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy-first design</div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to actually improve</h2>
            <p className="mt-4 text-zinc-400 text-lg">
              Designed around how real students learn under pressure — not how chatbots talk.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Brain, title: "Learning Brain", desc: "Tracks mastery per concept. The AI knows what you're weak at and adapts every session." },
              { icon: BookOpen, title: "Homework Mode", desc: "Step-by-step guided solving. No answer dumping — real understanding." },
              { icon: Zap, title: "Emergency Exam Mode", desc: "Compressed, high-yield review when time is running out." },
              { icon: Target, title: "Adaptive Quizzes", desc: "ELO-based difficulty. Gets harder or easier based on your actual performance." },
              { icon: Clock, title: "Spaced Repetition", desc: "SM-2 engine. Flashcards surface exactly when you're about to forget." },
              { icon: Sparkles, title: "Study Planner", desc: "Daily and weekly plans generated from your exam deadlines and weak topics." },
            ].map((f) => (
              <div key={f.title} className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-zinc-700 transition">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 sm:py-32 border-t border-zinc-800/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Not a chat box. A system.</h2>
            <p className="mt-4 text-zinc-400 text-lg">
              Most AI study tools just answer questions. StudyMind builds a model of you and gets better every day.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Tell us your context", desc: "Country, curriculum, grade, exam dates. Clean data from day one so the AI never guesses." },
              { step: "02", title: "Learn & practice", desc: "Ask anything, do homework, run emergency review, or generate quizzes. Every interaction updates your Learning Brain." },
              { step: "03", title: "Get smarter plans", desc: "Your home screen shows exactly what to review next. Weak topics surface proactively. Streaks keep you consistent." },
            ].map((s) => (
              <div key={s.step}>
                <div className="text-5xl font-bold text-zinc-800">{s.step}</div>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 sm:py-32 border-t border-zinc-800/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Pricing that respects your reality</h2>
            <p className="mt-4 text-zinc-400 text-lg">
              Regional pricing for Nigerian and African students. No US-centric defaults.
            </p>
          </div>
          <div className="mt-16 grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
              <h3 className="text-lg font-semibold">Free</h3>
              <p className="mt-1 text-sm text-zinc-400">Start learning today</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">₦0</span>
                <span className="text-zinc-500">/forever</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                {["Limited daily AI messages", "Full flashcards & spaced repetition", "Quiz generator (capped)", "Study planner basics"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-8 block w-full rounded-full border border-zinc-700 py-3 text-center text-sm font-medium hover:bg-zinc-800 transition">
                Get started
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border border-indigo-500/50 bg-zinc-900/60 p-8 shadow-xl shadow-indigo-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-medium text-white">
                Most popular
              </div>
              <h3 className="text-lg font-semibold">Pro</h3>
              <p className="mt-1 text-sm text-zinc-400">Unlimited learning</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">₦2,500</span>
                <span className="text-zinc-500">/month</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">~$1.50 · PPP-adjusted regional pricing</p>
              <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                {["Unlimited fast-tier AI", "Reasoning-tier access", "Homework & Exam modes", "Essay feedback", "Priority during peak times"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-8 block w-full rounded-full bg-indigo-500 py-3 text-center text-sm font-medium text-white hover:bg-indigo-400 transition">
                Upgrade to Pro
              </Link>
            </div>

            {/* Exam Pass */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
              <h3 className="text-lg font-semibold">Exam Pass</h3>
              <p className="mt-1 text-sm text-zinc-400">For the final stretch</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">₦4,500</span>
                <span className="text-zinc-500">/exam period</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">2–4 weeks unlimited access</p>
              <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                {["Time-boxed unlimited access", "Triggered around your exam dates", "All Pro features unlocked", "Perfect for WAEC/JAMB season"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-8 block w-full rounded-full border border-zinc-700 py-3 text-center text-sm font-medium hover:bg-zinc-800 transition">
                Get Exam Pass
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="py-24 sm:py-32 border-t border-zinc-800/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Join the waitlist</h2>
          <p className="mt-4 text-zinc-400 text-lg">
            Be among the first students to experience an AI tutor that actually learns with you.
          </p>
          <form className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="submit"
              className="rounded-full bg-indigo-500 px-6 py-3.5 text-sm font-medium text-white hover:bg-indigo-400 transition"
            >
              Join waitlist
            </button>
          </form>
          <p className="mt-4 text-xs text-zinc-500">No spam. Just early access updates.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 sm:py-32 border-t border-zinc-800/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-center">Frequently asked questions</h2>
          <div className="mt-12 space-y-6">
            {[
              {
                q: "Is StudyMind just another ChatGPT wrapper?",
                a: "No. StudyMind maintains a structured Learning Brain for every student — concept-level mastery, spaced-repetition state, and curriculum mapping. The AI is guided by this model so it adapts to you.",
              },
              {
                q: "Which curricula does it support?",
                a: "MVP focuses deeply on WAEC and JAMB. More curricula (GCSE, SAT, IB, CBSE, etc.) come in later phases once the core adaptation engine is proven.",
              },
              {
                q: "Will it work on low-end phones and poor network?",
                a: "Yes. Mobile-first design and offline-capable practice features (flashcards, cached quizzes) are core requirements.",
              },
              {
                q: "How is pricing handled for Nigeria?",
                a: "We use regional (PPP-adjusted) pricing. Pro is priced meaningfully lower in Naira than typical US/UK AI tools so it remains accessible.",
              },
            ].map((item) => (
              <div key={item.q} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
                <h3 className="font-semibold">{item.q}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">StudyMind</span>
            </div>
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} StudyMind. Built for students who actually want to improve.
            </p>
            <div className="flex gap-6 text-sm text-zinc-500">
              <a href="#" className="hover:text-zinc-300 transition">Privacy</a>
              <a href="#" className="hover:text-zinc-300 transition">Terms</a>
              <a href="#" className="hover:text-zinc-300 transition">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
