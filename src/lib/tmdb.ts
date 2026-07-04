const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY;

export const CACHE = {
  minute: 60,
  fiveMinutes: 300,
  fifteenMinutes: 900,
  hour: 3600,
  day: 86400,
} as const;

type ParamValue = string | number | boolean | null | undefined;

export class TmdbError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function tmdbFetch<T = any>(
  endpoint: string,
  params: Record<string, ParamValue> = {},
  cache: { revalidate?: number } = { revalidate: CACHE.hour },
): Promise<T> {
  if (!TMDB_KEY) throw new TmdbError(500, "TMDB API key not configured");
  if (!endpoint.startsWith("/")) {
    throw new TmdbError(500, "Invalid TMDB endpoint");
  }

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json", Authorization: `Bearer ${TMDB_KEY}` },
    next: { revalidate: cache.revalidate },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    let message = res.statusText || "TMDB request failed";
    try {
      const body = await res.json();
      message = body.status_message ?? body.message ?? message;
    } catch {
      /* keep status text */
    }
    throw new TmdbError(res.status, `TMDB ${res.status}: ${message}`);
  }

  return res.json() as Promise<T>;
}

export function jsonOk(
  data: unknown,
  status = 200,
  cache: { sMaxAge?: number; staleWhileRevalidate?: number } = {},
) {
  const sMaxAge = cache.sMaxAge ?? CACHE.hour;
  const stale = cache.staleWhileRevalidate ?? CACHE.day;

  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${stale}`,
    },
  });
}

export function jsonErr(msg: string, status = 500) {
  return Response.json(
    { error: msg },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function jsonFromError(error: unknown) {
  if (error instanceof TmdbError) {
    return jsonErr(error.message, error.status >= 400 && error.status < 500 ? error.status : 502);
  }
  return jsonErr(error instanceof Error ? error.message : "Unexpected server error");
}

export function requirePositiveInt(value: string | null, name: string): string | Response {
  const trimmed = value?.trim() ?? "";
  if (!/^[1-9]\d{0,9}$/.test(trimmed)) return jsonErr(`Invalid ${name}`, 400);
  return trimmed;
}

export function sanitizePage(value: string | null): string {
  const page = Number(value ?? "1");
  if (!Number.isInteger(page) || page < 1) return "1";
  return String(Math.min(page, 500));
}

export function sanitizeYear(value: string | null): string | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  if (year < 1870 || year > new Date().getFullYear() + 5) return null;
  return value;
}

export function sanitizeNumber(value: string | null, min = 0, max = 100000): string | null {
  if (!value || !/^\d+(\.\d+)?$/.test(value)) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return value;
}

export function sanitizeCsvInts(value: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!normalized.length || normalized.some((part) => !/^\d{1,10}$/.test(part))) return null;
  return normalized.join(",");
}

export function sanitizeLanguage(value: string | null): string | null {
  if (!value) return null;
  const lang = value.trim().toLowerCase();
  return /^[a-z]{2,3}$/.test(lang) ? lang : null;
}

const SORT_ALLOWLIST = new Set([
  "popularity.asc",
  "popularity.desc",
  "primary_release_date.asc",
  "primary_release_date.desc",
  "release_date.asc",
  "release_date.desc",
  "first_air_date.asc",
  "first_air_date.desc",
  "vote_average.asc",
  "vote_average.desc",
  "vote_count.asc",
  "vote_count.desc",
  "revenue.asc",
  "revenue.desc",
]);

export function sanitizeSort(value: string | null, fallback = "popularity.desc"): string {
  return value && SORT_ALLOWLIST.has(value) ? value : fallback;
}
