"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const CURRICULA = ["WAEC", "JAMB", "NECO", "IGCSE", "Other"];
const LEVELS = ["SS1", "SS2", "SS3", "Undergraduate", "Other"];
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
const STYLES = [
  { id: "simple", label: "Explain like I'm 10" },
  { id: "detailed", label: "Professor mode" },
  { id: "examples", label: "Real-life / football examples" },
  { id: "socratic", label: "Socratic" },
];

export default function EditProfilePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple controlled form — in production you'd prefill from server props
  const [curriculumCode, setCurriculumCode] = useState("WAEC");
  const [level, setLevel] = useState("SS3");
  const [primaryFocus, setPrimaryFocus] = useState("Physics");
  const [preferredExplanationStyle, setStyle] = useState("simple");
  const [dailyStudyTargetMin, setTarget] = useState(60);
  const [weakSubjects, setWeak] = useState<string[]>([]);

  function toggleWeak(s: string) {
    setWeak((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curriculumCode,
          level,
          primaryFocus,
          preferredExplanationStyle,
          dailyStudyTargetMin,
          weakSubjects,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.push("/app/profile");
      router.refresh();
    } catch {
      setError("Could not save changes");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link
          href="/app/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold">Edit academic profile</h1>
      </div>

      <Field label="Curriculum">
        <Select value={curriculumCode} onChange={setCurriculumCode} options={CURRICULA} />
      </Field>

      <Field label="Level">
        <Select value={level} onChange={setLevel} options={LEVELS} />
      </Field>

      <Field label="Primary focus">
        <Select value={primaryFocus} onChange={setPrimaryFocus} options={SUBJECTS} />
      </Field>

      <Field label="Explanation style">
        <div className="space-y-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                preferredExplanationStyle === s.id
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Daily study target (minutes)">
        <input
          type="number"
          min={15}
          max={300}
          value={dailyStudyTargetMin}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm"
        />
      </Field>

      <Field label="Weak subjects">
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleWeak(s)}
              className={`rounded-full px-3 py-1.5 text-xs border transition ${
                weakSubjects.includes(s)
                  ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          "Save changes"
        )}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-zinc-400 mb-2">{label}</p>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
