import {
  tmdbFetch,
  CacheConfig,
  validateParams,
  createResponse,
  createErrorResponse,
} from "@/lib/tmdb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    validateParams({ id }, ["id"]);

    const data = await tmdbFetch(
      `/person/${id}`,
      {
        append_to_response: "movie_credits,tv_credits,images",
      },
      CacheConfig.DETAILS
    );

    const { movie_credits, tv_credits, images, ...personDetails } = data;

    return createResponse({
      data: personDetails,
      movieCredits: movie_credits,
      tvCredits: tv_credits,
      images,
    });
  } catch (error) {
    console.error("Error fetching enhanced person details:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
