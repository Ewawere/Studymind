/**
 * Lightweight in-process domain event bus.
 * Modules publish; Analytics / Tutor / future jobs subscribe.
 *
 * For multi-instance production, swap the handler registry
 * for Redis/SQS without changing call sites.
 */

export type DomainEventType =
  | "QuestionAnswered"
  | "PracticeSessionCompleted"
  | "ExamSubmitted"
  | "MasteryUpdated"
  | "RevisionScheduled"
  | "OnboardingCompleted"
  | "TutorMessageSent"
  | "StreakUpdated";

export interface DomainEvent<T = Record<string, unknown>> {
  type: DomainEventType;
  userId: string;
  payload: T;
  at: string;
}

type Handler = (event: DomainEvent) => void | Promise<void>;

const handlers = new Map<DomainEventType | "*", Set<Handler>>();

export function on(
  type: DomainEventType | "*",
  handler: Handler
): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(handler);
  return () => handlers.get(type)?.delete(handler);
}

export async function publish(
  type: DomainEventType,
  userId: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const event: DomainEvent = {
    type,
    userId,
    payload,
    at: new Date().toISOString(),
  };
  const specific = handlers.get(type);
  const wildcard = handlers.get("*");
  const all = [...(specific ?? []), ...(wildcard ?? [])];
  await Promise.allSettled(all.map((h) => h(event)));
}
