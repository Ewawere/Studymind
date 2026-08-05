/**
 * Server-authoritative timing.
 * Client displays countdown from endsAt vs serverNow.
 */

export function computeEndsAt(startedAt: Date, timeLimitSec: number): Date {
  return new Date(startedAt.getTime() + timeLimitSec * 1000);
}

export function remainingSeconds(endsAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));
}

export function isExpired(endsAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= endsAt.getTime();
}

export function elapsedSeconds(startedAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
}
