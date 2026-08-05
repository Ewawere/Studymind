/**
 * Browser storage helpers for offline beta.
 * IndexedDB when available; localStorage fallback.
 * Safe no-ops on the server.
 */

const DB_NAME = "studymind_offline";
const DB_VERSION = 1;
const STORES = ["notes", "packs", "sessions", "queue"] as const;

type StoreName = (typeof STORES)[number];

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(store: StoreName, value: { id: string } & object) {
  if (!isBrowser()) return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet<T>(store: StoreName, id: string): Promise<T | null> {
  if (!isBrowser()) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  if (!isBrowser()) return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(store: StoreName, id: string) {
  if (!isBrowser()) return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const lsKey = (store: StoreName, id: string) => `sm_offline:${store}:${id}`;

function lsPut(store: StoreName, value: { id: string } & object) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(lsKey(store, value.id), JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function lsGet<T>(store: StoreName, id: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(lsKey(store, id));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsGetAll<T>(store: StoreName): T[] {
  if (typeof localStorage === "undefined") return [];
  const out: T[] = [];
  const prefix = `sm_offline:${store}:`;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) {
        const raw = localStorage.getItem(k);
        if (raw) out.push(JSON.parse(raw) as T);
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

function lsDelete(store: StoreName, id: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(lsKey(store, id));
}

export async function putRecord(store: StoreName, value: { id: string } & object) {
  try {
    await idbPut(store, value);
  } catch {
    lsPut(store, value);
  }
}

export async function getRecord<T>(store: StoreName, id: string): Promise<T | null> {
  try {
    const v = await idbGet<T>(store, id);
    if (v) return v;
  } catch {
    /* fall through */
  }
  return lsGet<T>(store, id);
}

export async function getAllRecords<T>(store: StoreName): Promise<T[]> {
  try {
    const v = await idbGetAll<T>(store);
    if (v.length) return v;
  } catch {
    /* fall through */
  }
  return lsGetAll<T>(store);
}

export async function deleteRecord(store: StoreName, id: string) {
  try {
    await idbDelete(store, id);
  } catch {
    /* ignore */
  }
  lsDelete(store, id);
}
