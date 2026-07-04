import { tmdbFetch } from "@/lib/tmdb";
import { getCachedMediaDetails } from "@/lib/media";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import MoviePageHero from "@/components/MoviePageHero";
import MovieRecsGrid from "@/components/MovieRecsGrid";
import MovieCastGrid from "@/components/MovieCastGrid";
import BlurImage from "@/components/BlurImage";
import TasteTracker from "@/components/TasteTracker";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const MOVIE_GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

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

interface PersonDetail {
  birthday?: string | null;
  place_of_birth?: string | null;
  biography?: string | null;
  combined_credits?: { cast?: unknown[] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data: movie } = await getCachedMediaDetails("movie", id);
    const title = movie.title ?? "Movie";
    const year = movie.release_date?.slice(0, 4);
    const description = movie.overview
      ? movie.overview.slice(0, 160)
      : `Watch trailers, cast details, ratings, and recommendations for ${title} on Supawatch.`;
    const image = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
      : movie.poster_path
        ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
        : undefined;

    return {
      title: year ? `${title} (${year})` : title,
      description,
      alternates: { canonical: `/movie/${id}` },
      keywords: [
        title,
        ...((movie.genres ?? []) as MovieGenre[]).map((g) => g.name),
        "movie",
        "trailer",
        "cast",
        "where to watch",
      ],
      openGraph: {
        title: `${title} | Supawatch`,
        description,
        type: "video.movie",
        url: `/movie/${id}`,
        images: image ? [{ url: image, alt: title }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | Supawatch`,
        description,
        images: image ? [image] : [],
      },
    };
  } catch {
    return { title: "Movie" };
  }
}

export default async function MoviePage({ params }: Props) {
  const { id } = await params;

  let enhanced: Awaited<ReturnType<typeof getCachedMediaDetails>>, recsData: { results?: MovieRec[] };

  try {
    [enhanced, recsData] = await Promise.all([
      getCachedMediaDetails("movie", id),
      tmdbFetch(`/movie/${id}/recommendations`, {}, { revalidate: 3600 }),
    ]);
  } catch {
    notFound();
  }

  const movie = enhanced.data;
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
      name: MOVIE_GENRE_MAP[g.id] ?? g.name,
    }))
    .slice(0, 4);

  const crew: CrewMember[] = credits?.crew ?? [];
  const directorEntry = crew.find((c) => c.job === "Director");

  let leadActor: PersonDetail | null = null;
  if (fullCast.length > 0) {
    leadActor = await tmdbFetch(
      `/person/${fullCast[0].id}`,
      { append_to_response: "combined_credits" },
      { revalidate: 3600 },
    ).catch(() => null);
  }

  const runtimeHours = Math.floor((movie.runtime ?? 0) / 60);
  const runtimeMins = (movie.runtime ?? 0) % 60;
  const runtimeLabel = movie.runtime
    ? `${runtimeHours}h ${runtimeMins}m`
    : null;
  const year = movie.release_date?.slice(0, 4) ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
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
      <MoviePageHero
        showId={movie.id}
        showName={movie.title}
        overview={movie.overview ?? ""}
        backdropPath={movie.backdrop_path ?? null}
        logo={logo}
        trailerKey={trailerKey}
        genres={genres}
        cast={heroCast}
        rating={movie.vote_average ?? 0}
        year={year}
        runtimeLabel={runtimeLabel}
        status={movie.status ?? null}
        director={directorEntry?.name ?? null}
        directorId={directorEntry?.id ?? null}
      />

      {movie.overview && (
        <div className="px-8 py-16 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex flex-col justify-center gap-0.5">
                <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
                  Synopsis
                </h2>
              </div>
            </div>
            <p className="max-w-[75ch] font-manrope text-[16px] leading-[1.8] text-neutral-300 md:text-[18px] md:leading-[1.9]">
              {movie.overview}
            </p>
          </div>
        </div>
      )}

      {fullCast.length > 0 && (
        <div className="px-8 pb-16 pt-16 lg:px-12 lg:pt-20">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex flex-col justify-center gap-0.5">
                <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
                  Cast
                </h2>
              </div>
            </div>

            {leadActor && (
              <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-stretch lg:gap-12">
                <div className="flex w-1/3 shrink-0 flex-col gap-3 sm:w-1/6">
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                    {fullCast[0].profile_path ? (
                      <BlurImage
                        src={`https://image.tmdb.org/t/p/w342${fullCast[0].profile_path}`}
                        alt={fullCast[0].name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-manrope text-[11px] text-neutral-600">
                        {fullCast[0].name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <p className="font-manrope text-[13px] font-light italic leading-tight text-white/90">
                      {fullCast[0].name}
                    </p>
                    <p className="mt-1 font-space text-[9px] uppercase leading-tight tracking-wider text-white/50">
                      {fullCast[0].character}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col justify-center gap-6 md:w-[240px] lg:w-[280px]">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-space text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                      Born
                    </span>
                    <span className="font-manrope text-[16px] font-light text-white/90">
                      {leadActor.birthday
                        ? new Date(leadActor.birthday).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-space text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                      Birthplace
                    </span>
                    <span className="font-manrope text-[16px] font-light text-white/90">
                      {leadActor.place_of_birth || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-space text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                      Credits
                    </span>
                    <span className="font-manrope text-[16px] font-light text-white/90">
                      {leadActor.combined_credits?.cast?.length ?? "—"}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Link
                      href={`/person/${fullCast[0].id}`}
                      className="group flex w-max items-center gap-1.5 border border-white/10 bg-white/[0.03] px-3 py-1.5 transition-colors hover:bg-white/10"
                    >
                      <span className="font-space text-[10px] uppercase tracking-wider text-white/80 transition-colors group-hover:text-white">
                        Filmography
                      </span>
                      <ArrowUpRight className="h-3 w-3 text-white/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                    </Link>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-center">
                  <span className="mb-4 font-space text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                    Biography
                  </span>
                  <p className="font-manrope text-[15px] font-light leading-[1.8] text-neutral-300 line-clamp-[8] md:text-[17px] md:leading-[1.9] xl:line-clamp-[10]">
                    {leadActor.biography || "No biography available."}
                  </p>
                </div>
              </div>
            )}

            <MovieCastGrid cast={fullCast.slice(1, 7)} />
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="px-8 pb-28 pt-16 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex flex-col justify-center gap-0.5">
                <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
                  More Like This
                </h2>
              </div>
            </div>
            <MovieRecsGrid recs={recs} />
          </div>
        </div>
      )}
    </div>
  );
}
