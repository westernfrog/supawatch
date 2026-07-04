type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const jsonCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchJson<T = any>(
  url: string,
  options: { ttlMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();
  const key = url;

  if (!options.signal) {
    const cached = jsonCache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) return cached.promise;
    if (cached) jsonCache.delete(key);
  }

  const promise = fetch(url, {
    headers: { accept: "application/json" },
    signal: options.signal,
  }).then(async (response) => {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? `Request failed: ${response.status}`);
    }
    return payload as T;
  });

  if (!options.signal && ttlMs > 0) {
    jsonCache.set(key, { expiresAt: now + ttlMs, promise });
    promise.catch(() => jsonCache.delete(key));
  }

  return promise;
}

export function clearJsonCache(url?: string) {
  if (url) jsonCache.delete(url);
  else jsonCache.clear();
}
