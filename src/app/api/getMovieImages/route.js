import {
  tmdbFetch,
  CacheConfig,
  validateParams,
  createResponse,
  createErrorResponse,
} from "@/lib/tmdb";

/**
 * GET /api/getMovieImages
 * Fetches movie images including logos
 * Query params: id (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "tv" or "movie" (default)

    // Validate required parameters
    validateParams({ id }, ["id"]);

    // Determine endpoint based on type
    const endpoint = type === "tv" ? `/tv/${id}/images` : `/movie/${id}/images`;

    // Fetch from TMDB
    const data = await tmdbFetch(
      endpoint,
      { include_image_language: "en,null" },
      CacheConfig.DETAILS
    );

    return createResponse({ data });
  } catch (error) {
    console.error("Error fetching movie images:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
