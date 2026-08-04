"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "Other"];
const CURRICULA = ["WAEC", "JAMB", "NECO", "IGCSE", "Other"];
const LEVELS = ["SS1", "SS2", "SS3", "Undergraduate", "Other"];
const STRESS_POINTS = [
  "Upcoming exams",
  "Understanding topics",
  "Staying consistent",
  "Time management",
  "Everything",
];
const SUBJECTS = [
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
  "English Language",
  "Economics",
  "Government",
  "Literature",
];
const EXPLANATION_STYLES = [
  { id: "simple", label: "Explain like I'm 10" },
  { id: "detailed", label: "Professor mode — detailed" },
  { id: "examples", label: "Use real-life / football examples" },
  { id: "socratic", label: "Socratic — ask me questions" },
];
const STUDY_TARGETS = [
  { value: 30, label: "30 min / day" },
  { value: 45, label: "45 min / day" },
  { value: 60, label: "1 hour / day" },
  { value: 90, label: "1.5 hours / day" },
  { value: 120, label: "2+ hours / day" },
];

type FormData = {
  country: string;
  curriculumCode: string;
  level: string;
  stressPoint: string;
  primaryFocus: string;
  weakSubjects: string[];
  targetExamDate: string;
  learningGoals: string;
  preferredExplanationStyle: string;
  dailyStudyTargetMin: number | null;
};

const initial: FormData = {
  country: "",
  curriculumCode: "",
  level: "",
  stressPoint: "",
  primaryFocus: "",
  weakSubjects: [],
  targetExamDate: "",
  learningGoals: "",
  preferredExplanationStyle: "",
  dailyStudyTargetMin: null,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 8;

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleWeak(subject: string) {
    setForm((prev) => {
      const exists = prev.weakSubjects.includes(subject);
      return {
        ...prev,
        weakSubjects: exists
          ? prev.weakSubjects.filter((s) => s !== subject)
          : [...prev.weakSubjects, subject],
      };
    });
  }

  function canContinue() {
    switch (step) {
      case 0:
        return !!form.country;
      case 1:
        return !!form.curriculumCode;
      case 2:
        return !!form.level;
      case 3:
        return !!form.stressPoint;
      case 4:
        return !!form.primaryFocus;
      case 5:
        return true; // weak subjects optional
      case 6:
        return true; // exam date optional
      case 7:
        return !!form.preferredExplanationStyle && form.dailyStudyTargetMin !== null;
      default:
        return false;
    }
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          learningGoals: form.learningGoals
            ? form.learningGoals.split(",").map((g) => g.trim()).filter(Boolean)
            : [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      router.push("/app");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  function next() {
    if (step === totalSteps - 1) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-10">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition ${
                i <= step ? "bg-indigo-500" : "bg-zinc-800"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-white">StudyMind</span>
        </div>

        {/* Step content */}
        {step === 0 && (
          <Step
            title="Where are you studying?"
            subtitle={`Step ${step + 1} of ${totalSteps}`}
          >
            <OptionList
              options={COUNTRIES}
              value={form.country}
              onSelect={(v) => update("country", v)}
            />
          </Step>
        )}

        {step === 1 && (
          <Step
            title="Which curriculum?"
            subtitle={`Step ${step + 1} of ${totalSteps}`}
          >
            <OptionList
              options={CURRICULA}
              value={form.curriculumCode}
              onSelect={(v) => update("curriculumCode", v)}
            />
          </Step>
        )}

        {step === 2 && (
          <Step
            title="What is your current level?"
            subtitle={`Step ${step + 1} of ${totalSteps}`}
          >
            <OptionList
              options={LEVELS}
              value={form.level}
              onSelect={(v) => update("level", v)}
            />
          </Step>
        )}

        {step === 3 && (
          <Step
            title="What's stressing you most right now?"
            subtitle={`Step ${step + 1} of ${totalSteps}`}
          >
            <OptionList
              options={STRESS_POINTS}
              value={form.stressPoint}
              onSelect={(v) => update("stressPoint", v)}
            />
          </Step>
        )}

        {step === 4 && (
          <Step
            title="What's your main subject focus?"
            subtitle={`Step ${step + 1} of ${totalSteps}`}
          >
            <OptionList
              options={SUBJECTS}
              value={form.primaryFocus}
              onSelect={(v) => update("primaryFocus", v)}
            />
          </Step>
        )}

        {step === 5 && (
          <Step
            title="Any weak subjects?"
            subtitle={`Step ${step + 1} of ${totalSteps} · Optional — select all that apply`}
          >
            <div className="space-y-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleWeak(s)}
                  className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                    form.weakSubjects.includes(s)
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 6 && (
          <Step
            title="When is your next major exam?"
            subtitle={`Step ${step + 1} of ${totalSteps} · Optional`}
          >
            <input
              type="date"
              value={form.targetExamDate}
              onChange={(e) => update("targetExamDate", e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-3 text-xs text-zinc-500">
              We use this to prioritize topics and build your study plan.
            </p>
          </Step>
        )}

        {step === 7 && (
          <Step
            title="How do you learn best?"
            subtitle={`Step ${step + 1} of ${totalSteps}`}
          >
            <div className="space-y-4">
              <div>
                <p className="text-sm text-zinc-400 mb-2">Explanation style</p>
                <div className="space-y-2">
                  {EXPLANATION_STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => update("preferredExplanationStyle", s.id)}
                      className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                        form.preferredExplanationStyle === s.id
                          ? "border-indigo-500 bg-indigo-500/10 text-white"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-400 mb-2">Daily study target</p>
                <div className="space-y-2">
                  {STUDY_TARGETS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update("dailyStudyTargetMin", t.value)}
                      className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                        form.dailyStudyTargetMin === t.value
                          ? "border-indigo-500 bg-indigo-500/10 text-white"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-400 mb-2">
                  Learning goals (optional)
                </p>
                <input
                  type="text"
                  placeholder="e.g. Score 70+ in Physics, pass WAEC"
                  value={form.learningGoals}
                  onChange={(e) => update("learningGoals", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </Step>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium hover:bg-zinc-900 transition disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            disabled={!canContinue() || saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-medium text-white hover:bg-indigo-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                {step === totalSteps - 1 ? "Finish setup" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
      <div className="mt-8 flex-1">{children}</div>
    </>
  );
}

function OptionList({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm transition ${
            value === option
              ? "border-indigo-500 bg-indigo-500/10 text-white"
              : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
