/**
 * Cache abstraction.
 * - Default: in-memory TTL (single instance)
 * - Optional Redis when REDIS_URL is set (multi-instance)
 */

import { platformConfig } from "./config";

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const memory = new Map<string, Entry<unknown>>();

type RedisLike = {
  get: (k: string) => Promise<string | null>;
  set: (k: string, v: string, mode: string, ttl: number) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  keys: (pattern: string) => Promise<string[]>;
};

let redis: RedisLike | null = null;

let redisInitAttempted = false;

async function getRedis(): Promise<RedisLike | null> {
  if (redisInitAttempted) return redis;
  redisInitAttempted = true;
  if (!platformConfig.redisUrl) return null;
  try {
    // Dynamic import so redis package is optional
    const mod = await import("ioredis").catch(() => null);
    if (!mod) return null;
    const client = new mod.default(platformConfig.redisUrl);
    // ioredis set() overloads don't match our narrow (mode, ttl) shape — cast is safe
    redis = client as unknown as RedisLike;
    return redis;
  } catch {
    return null;
  }
}

export function cacheKey(
  parts: (string | number | null | undefined)[]
): string {
  return parts.filter((p) => p != null && p !== "").join(":");
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = await getRedis();
  if (r) {
    const raw = await r.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  const hit = memory.get(key) as Entry<T> | undefined;
  if (!hit || hit.expiresAt <= Date.now()) {
    if (hit) memory.delete(key);
    return null;
  }
  return hit.value;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSec: number
): Promise<void> {
  const r = await getRedis();
  if (r) {
    await r.set(key, JSON.stringify(value), "EX", ttlSec);
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

export async function cached<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>
): Promise<T> {
  const existing = await cacheGet<T>(key);
  if (existing !== null) return existing;
  const value = await loader();
  await cacheSet(key, value, ttlSec);
  return value;
}

export function invalidate(prefix: string): void {
  // sync memory path (kept for existing callers)
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  void invalidateAsync(prefix);
}

export async function invalidateAsync(prefix: string): Promise<void> {
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  const r = await getRedis();
  if (r) {
    const keys = await r.keys(`${prefix}*`);
    if (keys.length) await r.del(...keys);
  }
}

export async function cacheBackend(): Promise<"redis" | "memory"> {
  return (await getRedis()) ? "redis" : "memory";
}
