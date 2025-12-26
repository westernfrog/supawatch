import { tmdbFetch, CacheConfig, validateParams, createResponse, createErrorResponse } from "@/lib/tmdb";

/**
 * GET /api/getMovieList
 * Fetches movie lists (popular, top_rated, now_playing, upcoming)
 * Query params: list (required), page (optional, default: 1)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const list = searchParams.get("list");
    const page = searchParams.get("page") || "1";

    validateParams({ list }, ["list"]);

    const data = await tmdbFetch(
      `/movie/${list}`,
      { page },
      CacheConfig.LISTS
    );

    return createResponse({ data });
  } catch (error) {
    console.error("Error fetching movie list:", error);
    return createErrorResponse(error.message, error.message.includes("Missing") ? 400 : 500);
  }
}
