import {
  tmdbFetch,
  CacheConfig,
  validateParams,
  createResponse,
  createErrorResponse,
} from "@/lib/tmdb";

/**
 * GET /api/getTVSeriesDetailsEnhanced
 * Fetches consolidated TV series data: details and images in a single request
 * Uses TMDB's append_to_response feature to reduce API calls from 2 to 1
 * Query params: id (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Validate required parameters
    validateParams({ id }, ["id"]);

    // Fetch from TMDB with append_to_response to get everything in one call
    const data = await tmdbFetch(
      `/tv/${id}`,
      {
        append_to_response: "images",
        include_image_language: "en,null",
      },
      CacheConfig.DETAILS
    );

    // Extract English logo from images
    let logo = null;
    const englishLogo = data.images?.logos?.find(
      (logo) => logo.iso_639_1 === "en"
    );
    if (englishLogo) {
      logo = englishLogo.file_path;
    }

    // Remove the appended data from the main response to keep it clean
    const { images, ...tvDetails } = data;

    return createResponse({
      data: tvDetails,
      logo,
    });
  } catch (error) {
    console.error("Error fetching enhanced TV series details:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
