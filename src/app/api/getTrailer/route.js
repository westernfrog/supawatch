import {
  tmdbFetch,
  CacheConfig,
  validateParams,
  createResponse,
  createErrorResponse,
} from "@/lib/tmdb";

/**
 * GET /api/getTrailer
 * Fetches movie trailer or teaser (excludes featurettes and other types)
 * Query params: id (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "tv" or "movie" (default)

    validateParams({ id }, ["id"]);

    const endpoint = type === "tv" ? `/tv/${id}/videos` : `/movie/${id}/videos`;

    const data = await tmdbFetch(endpoint, {}, CacheConfig.DETAILS);

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
    console.error("Error fetching trailer:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
