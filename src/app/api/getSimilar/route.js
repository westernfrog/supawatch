import { tmdbFetch, CacheConfig, validateParams, createResponse, createErrorResponse } from "@/lib/tmdb";

/**
 * GET /api/getSimilar
 * Fetches similar movies
 * Query params: id (required), page (optional, default: 1)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const page = searchParams.get("page") || "1";

    validateParams({ id }, ["id"]);

    const data = await tmdbFetch(
      `/movie/${id}/similar`,
      { page },
      CacheConfig.LISTS
    );

    return createResponse({ data });
  } catch (error) {
    console.error("Error fetching similar movies:", error);
    return createErrorResponse(error.message, error.message.includes("Missing") ? 400 : 500);
  }
}
