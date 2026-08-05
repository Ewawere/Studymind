/**
 * Integrity helpers — audit log, duplicate submit prevention.
 */

import type { IntegrityEvent } from "./types";

export function appendIntegrityEvent(
  events: IntegrityEvent[],
  type: IntegrityEvent["type"],
  meta?: Record<string, unknown>
): IntegrityEvent[] {
  return [
    ...events,
    {
      type,
      at: new Date().toISOString(),
      meta,
    },
  ].slice(-100); // keep last 100
}

export function assertCanSubmit(status: string): void {
  if (status === "submitted") {
    throw new Error("Exam already submitted");
  }
  if (status === "abandoned") {
    throw new Error("Exam was abandoned");
  }
}

export function assertExamActive(status: string): void {
  if (status !== "active" && status !== "paused") {
    throw new Error(`Exam is ${status} and cannot accept answers`);
  }
}
