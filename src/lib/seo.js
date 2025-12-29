const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://supawatch.vercel.app";
const SITE_NAME = "Supawatch";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;

export function generateBaseMetadata({
  title,
  description,
  image = DEFAULT_IMAGE,
  path = "",
  noIndex = false,
}) {
  const url = `${BASE_URL}${path}`;

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: true,
      },
    }),
  };
}

export function generateMovieJsonLd(movie) {
  if (!movie) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    image: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : DEFAULT_IMAGE,
    datePublished: movie.release_date,
    aggregateRating: movie.vote_average
      ? {
          "@type": "AggregateRating",
          ratingValue: movie.vote_average,
          bestRating: 10,
          ratingCount: movie.vote_count,
        }
      : undefined,
    genre: movie.genres?.map((g) => g.name),
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
  };
}

export function generateTVSeriesJsonLd(series) {
  if (!series) return null;

  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: series.name,
    description: series.overview,
    image: series.poster_path
      ? `https://image.tmdb.org/t/p/w500${series.poster_path}`
      : DEFAULT_IMAGE,
    datePublished: series.first_air_date,
    numberOfSeasons: series.number_of_seasons,
    numberOfEpisodes: series.number_of_episodes,
    aggregateRating: series.vote_average
      ? {
          "@type": "AggregateRating",
          ratingValue: series.vote_average,
          bestRating: 10,
          ratingCount: series.vote_count,
        }
      : undefined,
    genre: series.genres?.map((g) => g.name),
  };
}

export function generatePersonJsonLd(person) {
  if (!person) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    description: person.biography?.slice(0, 200),
    image: person.profile_path
      ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
      : undefined,
    birthDate: person.birthday,
    birthPlace: person.place_of_birth,
    jobTitle: person.known_for_department,
  };
}

export function generateWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: BASE_URL,
    description:
      "Explore movies and TV series like never before. Discover new content, watch trailers, and find your next favorite show.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export { BASE_URL, SITE_NAME, DEFAULT_IMAGE };
