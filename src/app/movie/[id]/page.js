import MovieClient from "./MovieClient";
import { generateMovieJsonLd } from "@/lib/seo";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function getMovieData(id) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Error fetching movie:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const movie = await getMovieData(id);

  if (!movie) {
    return {
      title: "Movie Not Found",
      description: "The requested movie could not be found.",
    };
  }

  const posterImage = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : undefined;

  const backdropImage = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : undefined;

  return {
    title: movie.title,
    description:
      movie.overview?.slice(0, 160) ||
      `Watch ${movie.title} on Supawatch. Explore trailers, cast, and more.`,
    openGraph: {
      title: `${movie.title} (${movie.release_date?.slice(0, 4) || ""})`,
      description: movie.overview?.slice(0, 200),
      type: "video.movie",
      images: backdropImage
        ? [
            {
              url: backdropImage,
              width: 1920,
              height: 1080,
              alt: movie.title,
            },
          ]
        : posterImage
        ? [
            {
              url: posterImage,
              width: 500,
              height: 750,
              alt: movie.title,
            },
          ]
        : [],
      releaseDate: movie.release_date,
    },
    twitter: {
      card: "summary_large_image",
      title: movie.title,
      description: movie.overview?.slice(0, 200),
      images: backdropImage
        ? [backdropImage]
        : posterImage
        ? [posterImage]
        : [],
    },
  };
}

export default async function MoviePage({ params }) {
  const { id } = await params;
  const movie = await getMovieData(id);
  const jsonLd = movie ? generateMovieJsonLd(movie) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <MovieClient key={id} id={id} initialData={movie} />
    </>
  );
}
