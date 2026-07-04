import {
  CACHE,
  jsonErr,
  jsonFromError,
  jsonOk,
  sanitizeCsvInts,
  sanitizeLanguage,
  sanitizeNumber,
  sanitizePage,
  sanitizeSort,
  sanitizeYear,
  tmdbFetch,
} from "@/lib/tmdb";
import { VALID_REGIONS } from "@/lib/geo";

function sanitizeOriginCountry(value: string | null): string | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return VALID_REGIONS.has(upper) ? upper : null;
}

type AnyObj = { popularity?: number } & Record<string, unknown>;

function buildParams(searchParams: URLSearchParams, isMovie: boolean): Record<string, string> {
  const p: Record<string, string> = {
    sort_by: sanitizeSort(searchParams.get("sort_by")),
    page: sanitizePage(searchParams.get("page")),
  };

  const voteAvgGte = sanitizeNumber(searchParams.get("vote_average_gte"), 0, 10);
  const voteCountGte = sanitizeNumber(searchParams.get("vote_count_gte"), 0, 1000000);
  const language = sanitizeLanguage(searchParams.get("language"));
  const originCountry = sanitizeOriginCountry(searchParams.get("origin_country"));
  const withGenres = sanitizeCsvInts(searchParams.get("with_genres"));
  const withoutGenres = sanitizeCsvInts(searchParams.get("without_genres"));
  const withKeywords = sanitizeCsvInts(searchParams.get("with_keywords"));
  const withNetworks = sanitizeCsvInts(searchParams.get("with_networks"));
  const yearFrom = sanitizeYear(searchParams.get("year_from"));
  const yearTo = sanitizeYear(searchParams.get("year_to"));
  const includeAdult = searchParams.get("include_adult") === "true";

  if (includeAdult) p.include_adult = "true";
  if (voteAvgGte) p["vote_average.gte"] = voteAvgGte;
  if (voteCountGte) p["vote_count.gte"] = voteCountGte;
  if (language) p.with_original_language = language;
  if (originCountry) p.with_origin_country = originCountry;
  if (withGenres) p.with_genres = withGenres;
  if (withoutGenres) p.without_genres = withoutGenres;
  if (withKeywords) p.with_keywords = withKeywords;
  if (withNetworks) p.with_networks = withNetworks;

  if (isMovie) {
    if (yearFrom) p["primary_release_date.gte"] = `${yearFrom}-01-01`;
    if (yearTo) p["primary_release_date.lte"] = `${yearTo}-12-31`;
  } else {
    if (yearFrom) p["first_air_date.gte"] = `${yearFrom}-01-01`;
    if (yearTo) p["first_air_date.lte"] = `${yearTo}-12-31`;
  }

  return p;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "movie";
  if (!["movie", "tv", "mixed"].includes(type)) return jsonErr("Invalid type param", 400);

  try {
    if (type === "mixed") {
      const [movieData, tvData] = await Promise.all([
        tmdbFetch<{ results?: AnyObj[] }>("/discover/movie", buildParams(searchParams, true), { revalidate: CACHE.hour }).catch(() => ({ results: [] })),
        tmdbFetch<{ results?: AnyObj[] }>("/discover/tv", buildParams(searchParams, false), { revalidate: CACHE.hour }).catch(() => ({ results: [] })),
      ]);

      const movies = (movieData.results ?? []).map((m) => ({ ...m, media_type: "movie" }));
      const tv = (tvData.results ?? []).map((t) => ({ ...t, media_type: "tv" }));
      const sorted = (arr: AnyObj[]) => [...arr].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
      const sm = sorted(movies);
      const st = sorted(tv);
      const interleaved: AnyObj[] = [];
      const len = Math.max(sm.length, st.length);

      for (let i = 0; i < len; i++) {
        if (sm[i]) interleaved.push(sm[i]);
        if (st[i]) interleaved.push(st[i]);
      }

      return jsonOk({ results: interleaved }, 200, { sMaxAge: CACHE.hour, staleWhileRevalidate: CACHE.day });
    }

    const endpoint = type === "tv" ? "/discover/tv" : "/discover/movie";
    const data = await tmdbFetch<{ results?: AnyObj[] }>(endpoint, buildParams(searchParams, type === "movie"), { revalidate: CACHE.hour });
    return jsonOk({ results: data.results ?? [] }, 200, { sMaxAge: CACHE.hour, staleWhileRevalidate: CACHE.day });
  } catch (e) {
    return jsonFromError(e);
  }
}
