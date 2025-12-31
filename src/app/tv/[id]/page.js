import TVClient from "./TVClient";
import { generateTVSeriesJsonLd } from "@/lib/seo";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function getTVData(id) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Error fetching TV series:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const series = await getTVData(id);

  if (!series) {
    return {
      title: "TV Series Not Found",
      description: "The requested TV series could not be found.",
    };
  }

  const posterImage = series.poster_path
    ? `https://image.tmdb.org/t/p/w500${series.poster_path}`
    : undefined;

  const backdropImage = series.backdrop_path
    ? `https://image.tmdb.org/t/p/original${series.backdrop_path}`
    : undefined;

  return {
    title: series.name,
    description:
      series.overview?.slice(0, 160) ||
      `Watch ${series.name} on Supawatch. Explore episodes, seasons, and more.`,
    openGraph: {
      title: `${series.name} (${series.first_air_date?.slice(0, 4) || ""})`,
      description: series.overview?.slice(0, 200),
      type: "video.tv_show",
      images: backdropImage
        ? [
            {
              url: backdropImage,
              width: 1920,
              height: 1080,
              alt: series.name,
            },
          ]
        : posterImage
        ? [
            {
              url: posterImage,
              width: 500,
              height: 750,
              alt: series.name,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: series.name,
      description: series.overview?.slice(0, 200),
      images: backdropImage
        ? [backdropImage]
        : posterImage
        ? [posterImage]
        : [],
    },
  };
}

export default async function TVSeriesPage({ params }) {
  const { id } = await params;
  const series = await getTVData(id);
  const jsonLd = series ? generateTVSeriesJsonLd(series) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <TVClient key={id} id={id} initialData={series} />
    </>
  );
}
