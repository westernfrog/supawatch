import { CACHE, jsonErr, jsonFromError, jsonOk, sanitizePage, tmdbFetch } from "@/lib/tmdb";

const TV_LISTS = new Set(["airing_today", "on_the_air", "popular", "top_rated"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const list = searchParams.get("list") ?? "popular";
  if (!TV_LISTS.has(list)) return jsonErr("Invalid list param", 400);

  try {
    const data = await tmdbFetch<{ results?: unknown[] }>(
      `/tv/${list}`,
      { page: sanitizePage(searchParams.get("page")) },
      { revalidate: CACHE.fifteenMinutes },
    );
    return jsonOk({ results: data.results ?? [] }, 200, { sMaxAge: CACHE.fifteenMinutes });
  } catch (e) {
    return jsonFromError(e);
  }
}
