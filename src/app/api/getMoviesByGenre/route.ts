import {
  CACHE,
  jsonErr,
  jsonFromError,
  jsonOk,
  sanitizeCsvInts,
  sanitizeNumber,
  sanitizePage,
  sanitizeSort,
  tmdbFetch,
} from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = sanitizeCsvInts(searchParams.get("id"));
  if (!id) return jsonErr("Invalid id param", 400);

  const params: Record<string, string> = {
    with_genres: id,
    page: sanitizePage(searchParams.get("page")),
    sort_by: sanitizeSort(searchParams.get("sort_by")),
  };
  const voteCountGte = sanitizeNumber(searchParams.get("vote_count_gte"), 0, 1000000);
  if (voteCountGte) params["vote_count.gte"] = voteCountGte;

  try {
    const data = await tmdbFetch<{ results?: unknown[]; total_pages?: number }>("/discover/movie", params, {
      revalidate: CACHE.hour,
    });

    return jsonOk({ results: data.results ?? [], total_pages: data.total_pages ?? 1 }, 200, { sMaxAge: CACHE.hour });
  } catch (e) {
    return jsonFromError(e);
  }
}
