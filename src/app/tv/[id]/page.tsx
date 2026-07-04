import { tmdbFetch } from "@/lib/tmdb";
import { getCachedMediaDetails } from "@/lib/media";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { type Season } from "@/components/TvSeasonsBrowser";
import TvPageHero from "@/components/TvPageHero";
import TvRecsGrid from "@/components/TvRecsGrid";
import TvCastGrid from "@/components/TvCastGrid";
import BlurImage from "@/components/BlurImage";
import TasteTracker from "@/components/TasteTracker";
import TvEpisodeWrapper from "@/components/TvEpisodeWrapper";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const TV_GENRE_MAP: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

interface Props {
  params: Promise<{ id: string }>;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface Rec {
  id: number;
  name: string;
  poster_path: string | null;
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
    const { data: show } = await getCachedMediaDetails("tv", id);
    const title = show.name ?? "TV Series";
    const year = show.first_air_date?.slice(0, 4);
    const description = show.overview
      ? show.overview.slice(0, 160)
      : `Watch trailers, cast details, episode information, and recommendations for ${title} on Supawatch.`;
    const image = show.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
      : show.poster_path
        ? `https://image.tmdb.org/t/p/w780${show.poster_path}`
        : undefined;

    return {
      title: year ? `${title} (TV Series ${year})` : title,
      description,
      alternates: { canonical: `/tv/${id}` },
      keywords: [
        title,
        ...((show.genres ?? []) as { name: string }[]).map((g) => g.name),
        "TV series",
        "episodes",
        "trailer",
        "cast",
        "where to watch",
      ],
      openGraph: {
        title: `${title} | Supawatch`,
        description,
        type: "video.tv_show",
        url: `/tv/${id}`,
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
    return { title: "TV Series" };
  }
}

export default async function TvPage({ params }: Props) {
  const { id } = await params;

  let enhanced: Awaited<ReturnType<typeof getCachedMediaDetails>>, recsData: { results?: Rec[] };

  try {
    [enhanced, recsData] = await Promise.all([
      getCachedMediaDetails("tv", id),
      tmdbFetch(`/tv/${id}/recommendations`, {}, { revalidate: 3600 }),
    ]);
  } catch {
    notFound();
  }

  const show = enhanced.data;
  const credits = enhanced.credits ?? {};
  const logo = enhanced.logo;
  const trailerKey = enhanced.trailerKey;

  if (!show || show.success === false) notFound();

  const heroCast: CastMember[] = (credits?.cast ?? []).slice(0, 4);
  const fullCast: CastMember[] = (credits?.cast ?? []).slice(0, 12);
  const createdByEntry = show.created_by?.[0] ?? null;
  const seasons: Season[] = (show.seasons ?? []).filter(
    (s: Season) => s.episode_count > 0,
  );
  const recs: Rec[] = (recsData?.results ?? [])
    .filter((r) => r.poster_path)
    .slice(0, 12);

  const genres = (show.genres ?? [])
    .map((g: { id: number; name: string }) => ({
      id: g.id,
      name: TV_GENRE_MAP[g.id] ?? g.name,
    }))
    .slice(0, 4);

  // Fetch lead actor details if we have cast
  let leadActor: PersonDetail | null = null;
  if (fullCast.length > 0) {
    leadActor = await tmdbFetch(
      `/person/${fullCast[0].id}`,
      { append_to_response: "combined_credits" },
      { revalidate: 3600 },
    ).catch(() => null);
  }

  const rt = show.episode_run_time?.[0];
  const episodeRuntime = rt ? `${rt}m / ep` : null;
  const year = show.first_air_date?.slice(0, 4) ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: show.name,
    description: show.overview || undefined,
    image: show.poster_path
      ? `https://image.tmdb.org/t/p/w780${show.poster_path}`
      : undefined,
    startDate: show.first_air_date || undefined,
    endDate: show.status === "Ended" ? show.last_air_date || undefined : undefined,
    genre: genres.map((g: { name: string }) => g.name),
    numberOfSeasons: show.number_of_seasons || undefined,
    numberOfEpisodes: show.number_of_episodes || undefined,
    creator: createdByEntry
      ? { "@type": "Person", name: createdByEntry.name }
      : undefined,
    actor: heroCast.map((c) => ({ "@type": "Person", name: c.name })),
    aggregateRating:
      show.vote_average && show.vote_count
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(show.vote_average.toFixed(1)),
            ratingCount: show.vote_count,
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
          id: show.id,
          media_type: "tv",
          title: show.name,
          poster_path: show.poster_path ?? null,
          backdrop_path: show.backdrop_path ?? null,
          genre_ids: ((show.genres ?? []) as { id: number }[]).map((g) => g.id),
        }}
      />
      {/* ── CINEMATIC HERO ── */}
      <TvPageHero
        showId={show.id}
        showName={show.name}
        overview={show.overview ?? ""}
        backdropPath={show.backdrop_path ?? null}
        logo={logo}
        trailerKey={trailerKey}
        genres={genres}
        seasons={seasons}
        cast={heroCast}
        rating={show.vote_average ?? 0}
        year={year}
        episodeRuntime={episodeRuntime}
        status={show.status ?? null}
        createdBy={createdByEntry?.name ?? null}
        createdById={createdByEntry?.id ?? null}
      />

      {/* ── OVERVIEW ── */}
      {show.overview && (
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
              {show.overview}
            </p>
          </div>
        </div>
      )}

      {/* ── EPISODE GUIDE + HEATMAP ── */}
      {seasons.length > 0 && (
        <TvEpisodeWrapper
          tvId={show.id}
          showId={show.id}
          showName={show.name}
          backdropPath={show.backdrop_path ?? null}
          logo={logo}
          seasons={seasons}
          rating={show.vote_average ?? 0}
          year={year}
        />
      )}

      {/* ── CAST ── */}
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

            {/* ── LEAD ACTOR HIGHLIGHT ── */}
            {leadActor && (
              <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-stretch lg:gap-12">
                {/* 1. Cast Card UI */}
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

                {/* 2. Metadata Columns (Stacked) */}
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

                {/* 3. Biography Overview */}
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

            {/* ── REST OF THE CAST ── */}
            <TvCastGrid cast={fullCast.slice(1, 7)} />
          </div>
        </div>
      )}

      {/* ── RECOMMENDATIONS ── */}
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
            <TvRecsGrid recs={recs} />
          </div>
        </div>
      )}
    </div>
  );
}
