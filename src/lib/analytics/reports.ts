/**
 * Export-ready reports (structured + CSV string).
 */

import { getStudentDashboard } from "./dashboard";
import { getPerformanceReport } from "./performance";
import { getPrediction } from "./predictions";
import { generateInsightSummary } from "./insights";
import { getProgressTimeline } from "./progress";
import type { ExportReport } from "./types";

function csvFromRows(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h];
          const s = String(v ?? "");
          return s.includes(",") ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

export async function exportReport(
  userId: string,
  type: ExportReport["type"] = "student"
): Promise<ExportReport> {
  const [dashboard, performance, prediction, insights, timeline] =
    await Promise.all([
      getStudentDashboard(userId),
      getPerformanceReport(userId),
      getPrediction(userId),
      generateInsightSummary(userId),
      getProgressTimeline(userId, 14),
    ]);

  const generatedAt = new Date().toISOString();

  if (type === "parent") {
    return {
      type,
      title: "StudyMind Parent Summary",
      generatedAt,
      sections: [
        {
          heading: "Overview",
          body: `Mastery ${dashboard.overallMastery}% · Streak ${dashboard.currentStreak} days · Readiness ${dashboard.examReadiness ?? "n/a"}%`,
        },
        {
          heading: "Highlights",
          body: insights.headlines.join(" "),
        },
        {
          heading: "What to encourage",
          body: dashboard.recommendedNext
            .map((r) => `• ${r.title}: ${r.reason}`)
            .join("\n"),
        },
      ],
    };
  }

  if (type === "progress") {
    const rows = timeline.map((p) => ({
      date: p.date,
      mastery: p.mastery,
      questions: p.questions,
      correct: p.correct,
    }));
    return {
      type,
      title: "Progress Report",
      generatedAt,
      sections: [
        {
          heading: "14-day timeline",
          body: "Daily mastery proxy and activity",
          rows,
        },
      ],
      csv: csvFromRows(rows),
    };
  }

  if (type === "exam" || type === "practice") {
    const rows = performance.bySubject.map((s) => ({
      subject: s.label,
      attempted: s.attempted,
      correct: s.correct,
      accuracy: s.accuracy,
    }));
    return {
      type,
      title: type === "exam" ? "Exam Performance" : "Practice Performance",
      generatedAt,
      sections: [
        {
          heading: "By subject",
          body: `Sessions — practice: ${performance.practiceSessions}, exams: ${performance.examSessions}`,
          rows,
        },
      ],
      csv: csvFromRows(rows),
    };
  }

  // student / teacher / admin default
  const subjectRows = dashboard.subjectMasteries.map((s) => ({
    subject: s.name,
    mastery: s.mastery,
    confidence: s.confidence,
    attempted: s.attempted,
    correct: s.correct,
  }));

  return {
    type: type === "teacher" || type === "admin" ? type : "student",
    title: "StudyMind Student Report",
    generatedAt,
    sections: [
      {
        heading: "Snapshot",
        body: `Level ${dashboard.playerLevel} · XP ${dashboard.xp} · Accuracy ${dashboard.accuracy}% · Expected score ${prediction.expectedExamScore}%`,
      },
      {
        heading: "Insights",
        body: [...insights.headlines, ...insights.details].join("\n"),
      },
      {
        heading: "Subjects",
        body: "Mastery by subject",
        rows: subjectRows,
      },
      {
        heading: "Next actions",
        body: dashboard.recommendedNext
          .map((r) => `• [${r.priority}] ${r.title} — ${r.reason}`)
          .join("\n"),
      },
    ],
    csv: csvFromRows(subjectRows),
  };
}
