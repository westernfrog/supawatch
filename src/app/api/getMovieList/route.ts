import { resolveRegion } from "@/lib/geo";
import { CACHE, jsonErr, jsonFromError, jsonOk, sanitizePage, tmdbFetch } from "@/lib/tmdb";

const MOVIE_LISTS = new Set(["now_playing", "popular", "top_rated", "upcoming"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const list = searchParams.get("list") ?? "popular";
  if (!MOVIE_LISTS.has(list)) return jsonErr("Invalid list param", 400);

  const params: Record<string, string> = { page: sanitizePage(searchParams.get("page")) };
  const regionParam = searchParams.get("region");
  if (regionParam) params.region = resolveRegion(regionParam);

  try {
    const data = await tmdbFetch(`/movie/${list}`, params, { revalidate: CACHE.fifteenMinutes });
    return jsonOk({ data }, 200, { sMaxAge: CACHE.fifteenMinutes });
  } catch (e) {
    return jsonFromError(e);
  }
}
