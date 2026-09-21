import { DetailNavigation, DetailFacts, DetailCastSection, DetailRecommendations } from "@/components/TitleDetailSections";
import { tmdbFetch, TmdbError } from "@/lib/tmdb";
import { GENRE_NAMES } from "@/lib/genres";
import { APP_NAME } from "@/lib/app-name";
import { getCachedMediaDetails } from "@/lib/media";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import MoviePageHero from "@/components/MoviePageHero";
import TasteTracker from "@/components/TasteTracker";
import { normalizeTitle } from "@/lib/discovery";

// Generate titles on first visit, then reuse the rendered page for an hour.
// Unknown IDs remain routable; only a confirmed TMDB 404 is a missing title.
export const revalidate = 3600;
export function generateStaticParams() { return []; }

interface Props {
  params: Promise<{ id: string }>;
}

interface MovieRec {
  id: number;
  title: string;
  poster_path: string | null;
}

interface MovieGenre {
  id: number;
  name: string;
}

interface CrewMember {
  id: number;
  job?: string;
  name: string;
}


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();
  try {
    const { data: movie } = await getCachedMediaDetails("movie", id);
    const title = movie.title ?? "Film";
    const year = movie.release_date?.slice(0, 4);
    const description = movie.overview
      ? movie.overview.slice(0, 160)
      : `Watch trailers, cast details, ratings, and recommendations for ${title} on ${APP_NAME}.`;
    const image = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
      : movie.poster_path
        ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
        : undefined;

    return {
      title: year ? `${title} (${year})` : title,
      description,
      alternates: { canonical: `/films/${id}` },
      keywords: [
        title,
        ...((movie.genres ?? []) as MovieGenre[]).map((g) => g.name),
        "movie",
        "trailer",
        "cast",
        "where to watch",
      ],
      openGraph: {
        title: `${title} | ${APP_NAME}`,
        description,
        type: "video.movie",
        url: `/films/${id}`,
        images: image ? [{ url: image, alt: title }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${APP_NAME}`,
        description,
        images: image ? [image] : [],
      },
    };
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound();
    return { robots: { index: false, follow: true }, title: "Film" };
  }
}

export default async function MoviePage({ params }: Props) {
  const { id } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();

  let enhanced: Awaited<ReturnType<typeof getCachedMediaDetails>>, recsData: { results?: MovieRec[] };

  try {
    [enhanced, recsData] = await Promise.all([
      getCachedMediaDetails("movie", id),
      tmdbFetch(`/movie/${id}/recommendations`, {}, { revalidate: 3600 }).catch(() => ({ results: [] })),
    ]);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound();
    throw error;
  }

  const movie = enhanced.data;
  const saveable = normalizeTitle({ ...movie, genre_ids: (movie.genres ?? []).map((genre: MovieGenre) => genre.id) }, "movie");
  const credits = enhanced.credits ?? {};
  const logo = enhanced.logo;
  const trailerKey = enhanced.trailerKey;

  if (!movie || movie.success === false) notFound();

  const heroCast = (credits?.cast ?? []).slice(0, 4);
  const fullCast = (credits?.cast ?? []).slice(0, 12);
  const recs = (recsData?.results ?? [])
    .filter((r) => r.poster_path)
    .slice(0, 12);

  const genres = ((movie.genres ?? []) as MovieGenre[])
    .map((g) => ({
      id: g.id,
      name: GENRE_NAMES[g.id] ?? g.name,
    }))
    .slice(0, 4);

  const crew: CrewMember[] = credits?.crew ?? [];
  const directorEntry = crew.find((c) => c.job === "Director");

  const runtimeHours = Math.floor((movie.runtime ?? 0) / 60);
  const runtimeMins = (movie.runtime ?? 0) % 60;
  const runtimeLabel = movie.runtime
    ? `${runtimeHours}h ${runtimeMins}m`
    : null;
  const year = movie.release_date?.slice(0, 4) ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Film",
    name: movie.title,
    description: movie.overview || undefined,
    image: movie.poster_path
      ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
      : undefined,
    datePublished: movie.release_date || undefined,
    genre: genres.map((g) => g.name),
    duration: movie.runtime ? `PT${runtimeHours}H${runtimeMins}M` : undefined,
    director: directorEntry
      ? { "@type": "Person", name: directorEntry.name }
      : undefined,
    actor: heroCast.map((c: { name: string }) => ({
      "@type": "Person",
      name: c.name,
    })),
    aggregateRating:
      movie.vote_average && movie.vote_count
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(movie.vote_average.toFixed(1)),
            ratingCount: movie.vote_count,
            bestRating: 10,
            worstRating: 0,
          }
        : undefined,
  };

  return (
    <div className="min-h-screen bg-[#010101] text-white">
      <JsonLd data={jsonLd} />
      <TasteTracker
        item={{
          id: movie.id,
          media_type: "movie",
          title: movie.title,
          poster_path: movie.poster_path ?? null,
          backdrop_path: movie.backdrop_path ?? null,
          genre_ids: ((movie.genres ?? []) as MovieGenre[]).map((g) => g.id),
        }}
      />
      <MoviePageHero id={movie.id} title={movie.title} poster={movie.poster_path ?? null} backdrop={movie.backdrop_path ?? null} logo={logo} trailer={trailerKey} trailerKeys={enhanced.trailerKeys} overview={movie.overview ?? ""} year={year} duration={runtimeLabel} status={movie.status ?? null} rating={movie.vote_average ?? 0} votes={movie.vote_count ?? 0} genres={genres} creator={directorEntry ?? null} saveable={saveable} />
      <div className="title-detail-body discovery-controls">
        <DetailNavigation />
        <DetailFacts facts={[
          { label: "Screenplay", value: [...new Set(crew.filter(person => ["Screenplay", "Writer"].includes(person.job ?? "")).map(person => person.name))].join(" / ") },
          { label: "Cinematography", value: crew.find(person => person.job === "Director of Photography")?.name },
          { label: "Music", value: crew.filter(person => person.job === "Original Music Composer").map(person => person.name).join(" / ") },
          { label: "Spoken languages", value: movie.spoken_languages?.map((language: { english_name: string }) => language.english_name).join(" / ") },
          { label: "Original title", value: movie.original_title },
          { label: "Release date", value: movie.release_date ? new Date(`${movie.release_date}T12:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" }) : null },
          { label: "Original language", value: movie.original_language ? new Intl.DisplayNames(["en"], { type: "language" }).of(movie.original_language) : null },
          { label: "Production", value: movie.production_companies?.map((company: { name: string }) => company.name).join(" / ") },
          { label: "Country", value: movie.production_countries?.map((country: { name: string }) => country.name).join(" / ") },
          { label: "Budget", value: movie.budget > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(movie.budget) : null },
          { label: "Box office", value: movie.revenue > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(movie.revenue) : null },
        ]} />
        <DetailCastSection cast={fullCast} />
        <DetailRecommendations items={recs} type="movie" />
      </div>
    </div>
  );
}
