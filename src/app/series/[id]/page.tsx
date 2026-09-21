import { DetailNavigation, DetailFacts, DetailCastSection, DetailRecommendations } from "@/components/TitleDetailSections";
import { tmdbFetch, TmdbError } from "@/lib/tmdb";
import { GENRE_NAMES } from "@/lib/genres";
import { APP_NAME } from "@/lib/app-name";
import { getCachedMediaDetails } from "@/lib/media";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { type Season } from "@/components/TvSeasonsBrowser";
import TvPageHero from "@/components/TvPageHero";
import TasteTracker from "@/components/TasteTracker";
import { normalizeTitle } from "@/lib/discovery";
import TvEpisodeWrapper from "@/components/TvEpisodeWrapper";

// Generate titles on first visit, then reuse the rendered page for an hour.
// Unknown IDs remain routable; only a confirmed TMDB 404 is a missing title.
export const revalidate = 3600;
export function generateStaticParams() { return []; }

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


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();
  try {
    const { data: show } = await getCachedMediaDetails("tv", id);
    const title = show.name ?? "Series";
    const year = show.first_air_date?.slice(0, 4);
    const description = show.overview
      ? show.overview.slice(0, 160)
      : `Watch trailers, cast details, episode information, and recommendations for ${title} on ${APP_NAME}.`;
    const image = show.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
      : show.poster_path
        ? `https://image.tmdb.org/t/p/w780${show.poster_path}`
        : undefined;

    return {
      title: year ? `${title} (Series ${year})` : title,
      description,
      alternates: { canonical: `/series/${id}` },
      keywords: [
        title,
        ...((show.genres ?? []) as { name: string }[]).map((g) => g.name),
        "series",
        "episodes",
        "trailer",
        "cast",
        "where to watch",
      ],
      openGraph: {
        title: `${title} | ${APP_NAME}`,
        description,
        type: "video.tv_show",
        url: `/series/${id}`,
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
    return { robots: { index: false, follow: true }, title: "Series" };
  }
}

export default async function TvPage({ params }: Props) {
  const { id } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();

  let enhanced: Awaited<ReturnType<typeof getCachedMediaDetails>>, recsData: { results?: Rec[] };

  try {
    [enhanced, recsData] = await Promise.all([
      getCachedMediaDetails("tv", id),
      tmdbFetch(`/tv/${id}/recommendations`, {}, { revalidate: 3600 }).catch(() => ({ results: [] })),
    ]);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound();
    throw error;
  }

  const show = enhanced.data;
  const saveable = normalizeTitle({ ...show, genre_ids: (show.genres ?? []).map((genre: { id: number }) => genre.id) }, "tv");
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
      name: GENRE_NAMES[g.id] ?? g.name,
    }))
    .slice(0, 4);

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
      <TvPageHero id={show.id} title={show.name} poster={show.poster_path ?? null} backdrop={show.backdrop_path ?? null} logo={logo} trailer={trailerKey} trailerKeys={enhanced.trailerKeys} overview={show.overview ?? ""} year={year} duration={episodeRuntime} status={show.status ?? null} rating={show.vote_average ?? 0} votes={show.vote_count ?? 0} genres={genres} creator={createdByEntry} saveable={saveable} seasons={seasons} />
      <div className="title-detail-body discovery-controls">
        <DetailNavigation episodes={seasons.length > 0} />
        {seasons.length > 0 && <TvEpisodeWrapper tvId={show.id} showId={show.id} showName={show.name} backdropPath={show.backdrop_path ?? null} logo={logo} seasons={seasons} rating={show.vote_average ?? 0} year={year} />}
        <DetailFacts facts={[
          { label: "Created by", value: show.created_by?.map((person: { name: string }) => person.name).join(" / ") },
          { label: "Series format", value: show.type },
          { label: "Latest episode", value: show.last_episode_to_air ? `S${show.last_episode_to_air.season_number} · E${show.last_episode_to_air.episode_number} — ${show.last_episode_to_air.name}` : null },
          { label: "Next episode", value: show.next_episode_to_air ? `${show.next_episode_to_air.name} · ${show.next_episode_to_air.air_date}` : null },
          { label: "Spoken languages", value: show.spoken_languages?.map((language: { english_name: string }) => language.english_name).join(" / ") },
          { label: "Original title", value: show.original_name },
          { label: "First aired", value: show.first_air_date ? new Date(`${show.first_air_date}T12:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" }) : null },
          { label: "Original language", value: show.original_language ? new Intl.DisplayNames(["en"], { type: "language" }).of(show.original_language) : null },
          { label: "Networks", value: show.networks?.map((network: { name: string }) => network.name).join(" / ") },
          { label: "Production", value: show.production_companies?.map((company: { name: string }) => company.name).join(" / ") },
          { label: "Episodes", value: show.number_of_episodes ? String(show.number_of_episodes) : null },
          { label: "Status", value: show.status },
        ]} />
        <DetailCastSection cast={fullCast} />
        <DetailRecommendations items={recs} type="tv" />
      </div>
    </div>
  );
}
