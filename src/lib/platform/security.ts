/**
 * Security helpers — rate limiting + response headers.
 */

import { platformConfig } from "./config";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts?: { windowSec?: number; max?: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const windowSec = opts?.windowSec ?? platformConfig.rateLimit.windowSec;
  const max = opts?.max ?? platformConfig.rateLimit.maxRequests;
  const now = Date.now();
  let b = buckets.get(key);

  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowSec * 1000 };
    buckets.set(key, b);
  }

  b.count += 1;
  const allowed = b.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - b.count),
    resetAt: b.resetAt,
  };
}

/** Standard security headers for Next.js middleware / route handlers */
export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-XSS-Protection": "0",
    ...(platformConfig.isProd
      ? {
          "Strict-Transport-Security":
            "max-age=63072000; includeSubDomains; preload",
        }
      : {}),
  };
}

export function applySecurityHeaders(headers: Headers) {
  for (const [k, v] of Object.entries(securityHeaders())) {
    headers.set(k, v);
  }
}
