import { tmdbFetch, CacheConfig, validateParams, createResponse, createErrorResponse } from "@/lib/tmdb";

/**
 * GET /api/getPeople
 * Fetches person details (actor, director, etc.)
 * Query params: id (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Validate required parameters
    validateParams({ id }, ["id"]);

    // Fetch from TMDB
    const data = await tmdbFetch(
      `/person/${id}`,
      {},
      CacheConfig.DETAILS
    );

    return createResponse({ data });
  } catch (error) {
    console.error("Error fetching person details:", error);
    return createErrorResponse(error.message, error.message.includes("Missing") ? 400 : 500);
  }
}
