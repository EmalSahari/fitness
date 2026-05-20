type Entry<T> = { data: T; ts: number };
const store = new Map<string, Entry<unknown>>();
const TTL = 90 * 1000; // 90 seconds

export function getCached<T>(key: string): T | null {
  const e = store.get(key) as Entry<T> | undefined;
  if (!e) return null;
  if (Date.now() - e.ts > TTL) { store.delete(key); return null; }
  return e.data;
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}

export function invalidateCache(...prefixes: string[]): void {
  for (const key of store.keys()) {
    if (prefixes.some(p => key.startsWith(p))) store.delete(key);
  }
}
