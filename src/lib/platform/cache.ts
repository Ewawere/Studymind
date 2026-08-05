/**
 * In-memory TTL cache. Replace with Redis in multi-instance deploys.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = await loader();
  store.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  return value;
}

export function invalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function cacheKey(parts: (string | number | null | undefined)[]): string {
  return parts.filter((p) => p != null && p !== "").join(":");
}
