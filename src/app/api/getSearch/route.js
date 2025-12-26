import {
  tmdbFetch,
  CacheConfig,
  validateParams,
  createResponse,
  createErrorResponse,
} from "@/lib/tmdb";

/**
 * GET /api/getSearch
 * Searches for movies and TV shows
 * Query params: query (required), page (optional, default: 1)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const page = searchParams.get("page") || "1";
    const includeAdult = searchParams.get("include_adult") || "false";

    validateParams({ query }, ["query"]);

    const data = await tmdbFetch(
      `/search/multi`,
      {
        query: query,
        page,
        include_adult: includeAdult,
      },
      CacheConfig.SEARCH
    );

    return createResponse({ data });
  } catch (error) {
    console.error("Error searching:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
