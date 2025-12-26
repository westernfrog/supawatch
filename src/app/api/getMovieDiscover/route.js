import { tmdbFetch, CacheConfig, validateParams, createResponse, createErrorResponse } from "@/lib/tmdb";

/**
 * GET /api/getMovieDiscover
 * Discovers movies by genre
 * Query params: genre (required), page (optional, default: 1)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre");
    const page = searchParams.get("page") || "1";

    validateParams({ genre }, ["genre"]);

    const data = await tmdbFetch(
      `/discover/movie`,
      { 
        with_genres: genre,
        page,
        sort_by: "popularity.desc"
      },
      CacheConfig.LISTS
    );

    return createResponse({ data });
  } catch (error) {
    console.error("Error discovering movies:", error);
    return createErrorResponse(error.message, error.message.includes("Missing") ? 400 : 500);
  }
}
