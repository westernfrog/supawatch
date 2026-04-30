import {
  tmdbFetch,
  CacheConfig,
  createResponse,
  createErrorResponse,
} from "@/lib/tmdb";

/**
 * GET /api/getTrending
 * Fetches trending content from TMDB
 * Query params:
 *   type        – "movie" | "tv" | "person" | "all"  (default: "movie")
 *   time_window – "day" | "week"                      (default: "week")
 *   page        – page number                         (default: 1)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "movie";
    const timeWindow = searchParams.get("time_window") || "week";
    const page = searchParams.get("page") || "1";

    const data = await tmdbFetch(
      `/trending/${type}/${timeWindow}`,
      { page },
      CacheConfig.LISTS
    );

    return createResponse({ data });
  } catch (error) {
    console.error("Error fetching trending:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
