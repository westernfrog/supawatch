import {
  tmdbFetch,
  CacheConfig,
  createResponse,
  createErrorResponse,
} from "@/lib/tmdb";

/**
 * GET /api/getDiscover
 * Flexible discover endpoint for movies & TV via TMDB /discover
 *
 * Query params:
 *   type          – "movie" | "tv"  (default: "movie")
 *   sort_by       – e.g. "popularity.desc", "vote_average.desc"
 *   with_genres   – comma-separated genre IDs
 *   with_keywords – comma-separated keyword IDs
 *   with_networks – comma-separated network IDs (TV only)
 *   vote_average.gte – minimum vote average
 *   vote_count.gte   – minimum vote count
 *   with_original_language – e.g. "en", "ja"
 *   page          – page number (default: 1)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "movie";
    const endpoint = type === "tv" ? "/discover/tv" : "/discover/movie";

    // Forward all recognised params directly to TMDB
    const params = {};
    const forward = [
      "sort_by",
      "with_genres",
      "with_keywords",
      "with_networks",
      "vote_average.gte",
      "vote_count.gte",
      "with_original_language",
      "page",
      "with_watch_monetization_types",
      "without_genres",
      "primary_release_year",
      "first_air_date_year",
    ];

    for (const key of forward) {
      const val = searchParams.get(key);
      if (val) params[key] = val;
    }

    if (!params.page) params.page = "1";
    if (!params.sort_by) params.sort_by = "popularity.desc";

    const data = await tmdbFetch(endpoint, params, CacheConfig.LISTS);
    return createResponse({ data });
  } catch (error) {
    console.error("Error in getDiscover:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
