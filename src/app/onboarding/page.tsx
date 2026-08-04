"use client";

import { useState } from "react";
import { Brain, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    id: "country",
    title: "Where are you studying?",
    options: ["Nigeria", "Ghana", "Kenya", "South Africa", "Other"],
  },
  {
    id: "curriculum",
    title: "Which curriculum?",
    options: ["WAEC", "JAMB", "NECO", "IGCSE", "Other"],
  },
  {
    id: "level",
    title: "What is your current level?",
    options: ["SS1", "SS2", "SS3", "Undergraduate", "Other"],
  },
  {
    id: "stress",
    title: "What's stressing you most right now?",
    options: [
      "Upcoming exams",
      "Understanding topics",
      "Staying consistent",
      "Time management",
      "Everything",
    ],
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = steps[step];
  const isLast = step === steps.length - 1;

  function select(option: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: option }));
  }

  function next() {
    if (isLast) {
      // In real app: save profile → redirect to /app
      window.location.href = "/app";
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((_, i) => (
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
          <span className="font-semibold">StudyMind</span>
        </div>

        <h1 className="text-2xl font-bold">{current.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Step {step + 1} of {steps.length}
        </p>

        <div className="mt-8 space-y-3 flex-1">
          {current.options.map((option) => (
            <button
              key={option}
              onClick={() => select(option)}
              className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                answers[current.id] === option
                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium hover:bg-zinc-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <button
            onClick={next}
            disabled={!answers[current.id]}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-medium text-white hover:bg-indigo-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLast ? "Finish setup" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
