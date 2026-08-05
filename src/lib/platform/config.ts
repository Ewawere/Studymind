/**
 * Environment validation + central platform configuration.
 * Call validateEnv() once at process startup.
 */

export const platformConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  analyticsCacheTtlSec: Number(process.env.ANALYTICS_CACHE_TTL ?? 60),
  dashboardCacheTtlSec: Number(process.env.DASHBOARD_CACHE_TTL ?? 30),
  defaultDailyStudyMin: 45,
  passThresholdPct: Number(process.env.PASS_THRESHOLD_PCT ?? 50),
  strongMasteryThreshold: 75,
  weakMasteryThreshold: 50,

  redisUrl: process.env.REDIS_URL ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",

  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "",
    region: process.env.S3_REGION ?? "auto",
    bucket: process.env.S3_BUCKET ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",
  },

  email: {
    provider: (process.env.EMAIL_PROVIDER ?? "console") as
      | "console"
      | "resend"
      | "postmark"
      | "sendgrid",
    apiKey: process.env.EMAIL_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "StudyMind <noreply@studymind.app>",
  },

  sentryDsn: process.env.SENTRY_DSN ?? "",
  otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "",

  rateLimit: {
    windowSec: Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 60),
    maxRequests: Number(process.env.RATE_LIMIT_MAX ?? 120),
  },

  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
    secretKey: process.env.CLERK_SECRET_KEY ?? "",
  },
} as const;

export type EnvIssue = { key: string; message: string; level: "error" | "warn" };

/**
 * Validate required production env vars.
 * Returns issues; throws only if `throwOnError` and critical missing.
 */
export function validateEnv(opts?: {
  throwOnError?: boolean;
}): { ok: boolean; issues: EnvIssue[] } {
  const issues: EnvIssue[] = [];
  const prod = platformConfig.isProd;

  const require = (key: string, value: string, prodOnly = true) => {
    if (!value && (!prodOnly || prod)) {
      issues.push({
        key,
        message: `${key} is required${prodOnly ? " in production" : ""}`,
        level: "error",
      });
    }
  };

  require("DATABASE_URL", platformConfig.databaseUrl, false);
  require("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", platformConfig.clerk.publishableKey);
  require("CLERK_SECRET_KEY", platformConfig.clerk.secretKey);

  if (prod && !platformConfig.redisUrl) {
    issues.push({
      key: "REDIS_URL",
      message: "REDIS_URL recommended for multi-instance cache/queues",
      level: "warn",
    });
  }

  if (prod && !platformConfig.s3.bucket) {
    issues.push({
      key: "S3_BUCKET",
      message: "Object storage not configured — media uploads disabled",
      level: "warn",
    });
  }

  if (prod && platformConfig.email.provider !== "console" && !platformConfig.email.apiKey) {
    issues.push({
      key: "EMAIL_API_KEY",
      message: "Email provider selected but EMAIL_API_KEY missing",
      level: "error",
    });
  }

  const ok = !issues.some((i) => i.level === "error");
  if (!ok && opts?.throwOnError) {
    throw new Error(
      `Environment validation failed:\n` +
        issues.map((i) => `- [${i.level}] ${i.key}: ${i.message}`).join("\n")
    );
  }
  return { ok, issues };
}
