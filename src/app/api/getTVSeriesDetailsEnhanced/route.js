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
      `/tv/${id}`,
      {
        append_to_response: "images,videos,credits,recommendations",
        include_image_language: "en,null",
      },
      CacheConfig.DETAILS
    );

    let logo = null;
    const englishLogo = data.images?.logos?.find(
      (logo) => logo.iso_639_1 === "en"
    );
    if (englishLogo) {
      logo = englishLogo.file_path;
    }

    const trailerVideo =
      data.videos?.results?.find(
        (video) => video.type === "Trailer" && video.site === "YouTube"
      ) ||
      data.videos?.results?.find(
        (video) => video.type === "Teaser" && video.site === "YouTube"
      );

    const trailer = trailerVideo
      ? {
          key: trailerVideo.key,
          name: trailerVideo.name,
          type: trailerVideo.type,
        }
      : {
          key: null,
          name: null,
          type: null,
        };

    const { images, videos, credits, recommendations, ...tvDetails } = data;

    return createResponse({
      data: tvDetails,
      logo,
      trailer,
      credits,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching enhanced TV series details:", error);
    return createErrorResponse(
      error.message,
      error.message.includes("Missing") ? 400 : 500
    );
  }
}
