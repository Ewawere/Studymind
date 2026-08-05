/**
 * Central platform configuration.
 */

export const platformConfig = {
  analyticsCacheTtlSec: Number(process.env.ANALYTICS_CACHE_TTL ?? 60),
  dashboardCacheTtlSec: Number(process.env.DASHBOARD_CACHE_TTL ?? 30),
  defaultDailyStudyMin: 45,
  passThresholdPct: 50,
  strongMasteryThreshold: 75,
  weakMasteryThreshold: 50,
} as const;
