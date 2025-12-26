import {
  tmdbFetch,
  CacheConfig,
  validateParams,
  createResponse,
  createErrorResponse,
} from "@/lib/tmdb";

/**
 * GET /api/getTVTrailer
 * Fetches TV series trailer or teaser (excludes featurettes and other types)
 * Query params: id (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Validate required parameters
    validateParams({ id }, ["id"]);

    // Fetch from TMDB
    const data = await tmdbFetch(`/tv/${id}/videos`, {}, CacheConfig.DETAILS);

    // Find Trailer first, then Teaser (exclude Featurette and other types)
    const trailer =
      data.results?.find(
        (video) => video.type === "Trailer" && video.site === "YouTube"
      ) ||
      data.results?.find(
        (video) => video.type === "Teaser" && video.site === "YouTube"
      );

    if (!trailer) {
      return createResponse({ key: null, name: null, type: null });
    }

    return createResponse({
      key: trailer.key,
      name: trailer.name,
      type: trailer.type,
    });
  } catch (error) {
    console.error("Error fetching TV trailer:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
