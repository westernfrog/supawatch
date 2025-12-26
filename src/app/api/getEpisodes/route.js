import { tmdbFetch, CacheConfig, validateParams, createResponse, createErrorResponse } from "@/lib/tmdb";

/**
 * GET /api/getEpisodes
 * Fetches episodes for a specific TV series season
 * Query params: id (required), season (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const season = searchParams.get("season");

    validateParams({ id, season }, ["id", "season"]);

    const data = await tmdbFetch(
      `/tv/${id}/season/${season}`,
      {},
      CacheConfig.DETAILS
    );

    return createResponse({ data });
  } catch (error) {
    console.error("Error fetching episodes:", error);
    return createErrorResponse(error.message, error.message.includes("Missing") ? 400 : 500);
  }
}
