import { CACHE, jsonErr, jsonFromError, jsonOk, sanitizeCsvInts, sanitizePage, tmdbFetch } from "@/lib/tmdb";

type AnyObj = { popularity?: number } & Record<string, unknown>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = sanitizeCsvInts(searchParams.get("id"));
  if (!id) return jsonErr("Invalid id param", 400);
  const page = sanitizePage(searchParams.get("page"));

  try {
    const [movieData, tvData] = await Promise.all([
      tmdbFetch<{ results?: AnyObj[]; total_pages?: number }>("/discover/movie", { with_genres: id, page, sort_by: "popularity.desc" }).catch(() => ({ results: [], total_pages: 1 })),
      tmdbFetch<{ results?: AnyObj[]; total_pages?: number }>("/discover/tv", { with_genres: id, page, sort_by: "popularity.desc" }).catch(() => ({ results: [], total_pages: 1 })),
    ]);

    const movies = (movieData.results ?? []).map((m) => ({ ...m, media_type: "movie" }));
    const tv = (tvData.results ?? []).map((t) => ({ ...t, media_type: "tv" }));
    const combined = [...movies, ...tv].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    const total_pages = Math.max(movieData.total_pages ?? 1, tvData.total_pages ?? 1);

    return jsonOk({ results: combined, total_pages }, 200, { sMaxAge: CACHE.hour });
  } catch (e) {
    return jsonFromError(e);
  }
}
