import { tmdbFetch, CacheConfig, validateParams, createResponse, createErrorResponse } from "@/lib/tmdb";

/**
 * GET /api/getTVList
 * Fetches TV series lists (popular, top_rated, on_the_air, airing_today)
 * Query params: list (required), page (optional, default: 1)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const list = searchParams.get("list");
    const page = searchParams.get("page") || "1";

    validateParams({ list }, ["list"]);

    const data = await tmdbFetch(
      `/tv/${list}`,
      { page },
      CacheConfig.LISTS
    );

    return createResponse({ data });
  } catch (error) {
    console.error("Error fetching TV list:", error);
    return createErrorResponse(error.message, error.message.includes("Missing") ? 400 : 500);
  }
}
