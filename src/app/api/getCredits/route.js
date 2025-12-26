import {
  tmdbFetch,
  CacheConfig,
  validateParams,
  createResponse,
  createErrorResponse,
} from "@/lib/tmdb";

/**
 * GET /api/getCredits
 * Fetches movie credits (cast and crew)
 * Query params: id (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "tv" or "movie" (default)

    validateParams({ id }, ["id"]);

    const endpoint =
      type === "tv" ? `/tv/${id}/credits` : `/movie/${id}/credits`;

    const data = await tmdbFetch(endpoint, {}, CacheConfig.DETAILS);

    return createResponse({ data });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
