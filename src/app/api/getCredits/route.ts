import { resolveRegion } from "@/lib/geo";
import { CACHE, jsonErr, jsonFromError, jsonOk, requirePositiveInt, tmdbFetch } from "@/lib/tmdb";
import { findBestTrailerKey, pickProviderRegion, streamingProviders, type MediaType } from "@/lib/media";

type CastCredit = { id: number; name: string; profile_path?: string | null };
type SeasonSummary = { season_number: number; episode_count: number; name: string };
type VideoResult = {
  key?: string | null;
  site?: string | null;
  type?: string | null;
  official?: boolean | null;
  iso_639_1?: string | null;
  name?: string | null;
  published_at?: string | null;
};
type CreditsPayload = {
  origin_country?: string[];
  production_countries?: { iso_3166_1?: string }[];
  original_language?: string | null;
  backdrop_path?: string | null;
  credits?: { cast?: CastCredit[] };
  videos?: { results?: VideoResult[] };
  images?: { backdrops?: { file_path?: string | null; iso_639_1?: string | null }[] };
  number_of_seasons?: number | null;
  episode_run_time?: number[];
  runtime?: number | null;
  vote_average?: number;
  release_date?: string | null;
  first_air_date?: string | null;
  seasons?: SeasonSummary[];
};

function mediaTypeFromParam(value: string | null): MediaType | Response {
  if (value === null || value === "movie") return "movie";
  if (value === "tv") return "tv";
  return jsonErr("Invalid type param", 400);
}

function countriesForTrailer(type: MediaType, data: CreditsPayload): string[] {
  if (type === "tv") return Array.isArray(data.origin_country) ? data.origin_country : [];
  if (!Array.isArray(data.production_countries)) return [];
  return data.production_countries
    .map((country) => country.iso_3166_1)
    .filter((country): country is string => typeof country === "string" && /^[A-Z]{2}$/.test(country));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = requirePositiveInt(searchParams.get("id"), "id");
  if (id instanceof Response) return id;

  const type = mediaTypeFromParam(searchParams.get("type"));
  if (type instanceof Response) return type;

  const region = resolveRegion(searchParams.get("region"));

  try {
    const [data, wpData] = await Promise.all([
      tmdbFetch<CreditsPayload>(
        `/${type}/${id}`,
        {
          append_to_response: "credits,videos,images",
          include_image_language: "en,null",
          include_video_language: "en,null",
        },
        { revalidate: CACHE.day },
      ),
      tmdbFetch<{ results?: Record<string, unknown> }>(`/${type}/${id}/watch/providers`, {}, { revalidate: CACHE.day }).catch(() => null),
    ]);

    const cast = (data.credits?.cast ?? []).slice(0, 4).map((c) => ({
      id: c.id,
      name: c.name,
      profile_path: c.profile_path ?? null,
    }));

    const trailerKey = await findBestTrailerKey(
      type,
      id,
      data.videos?.results ?? [],
      typeof data.original_language === "string" ? data.original_language : null,
      countriesForTrailer(type, data),
    );

    /* Montage frames — textless stills only. Language-tagged backdrops are
       promo key art with the title baked in (they read as posters on
       screen), so they never make the cut; null-language backdrops are
       actual scenes. Too few clean stills → the client skips the montage. */
    const backdrops: string[] = (data.images?.backdrops ?? [])
      .filter((b) => !b.iso_639_1)
      .map((b) => b.file_path)
      .filter((p): p is string => Boolean(p && p !== data.backdrop_path))
      .slice(0, 5);

    const pickedRegion = pickProviderRegion(wpData?.results as Parameters<typeof pickProviderRegion>[0], region);
    const firstProvider = streamingProviders(pickedRegion.data, 1)[0] ?? null;
    const provider = firstProvider
      ? { logo_path: firstProvider.logo_path, provider_name: firstProvider.provider_name }
      : null;

    const seasons: number | null = type === "tv" ? (data.number_of_seasons ?? null) : null;
    const runtime: number | null =
      type === "tv" ? (data.episode_run_time?.[0] ?? null) : (data.runtime ?? null);
    const vote_average: number = data.vote_average ?? 0;
    const release_date: string | null = data.release_date ?? null;
    const first_air_date: string | null = data.first_air_date ?? null;
    const seasons_list = type === "tv"
      ? (data.seasons ?? [])
          .filter((s) => s.episode_count > 0)
          .map((s) => ({
            season_number: s.season_number,
            episode_count: s.episode_count,
            name: s.name,
          }))
      : [];

    return jsonOk(
      { cast, seasons, runtime, vote_average, release_date, first_air_date, seasons_list, trailerKey, provider, backdrops },
      200,
      { sMaxAge: CACHE.day, staleWhileRevalidate: CACHE.day },
    );
  } catch (e) {
    return jsonFromError(e);
  }
}
