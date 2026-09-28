import { cache } from "react";
import { CACHE, tmdbFetch, TmdbError } from "@/lib/tmdb";

export type MediaType = "movie" | "tv";

type TmdbVideo = {
  key?: string | null;
  site?: string | null;
  type?: string | null;
  official?: boolean | null;
  iso_639_1?: string | null;
  name?: string | null;
  published_at?: string | null;
};

type Logo = {
  iso_639_1?: string | null;
  file_path?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
};

type ProviderRegion = {
  link?: string | null;
  flatrate?: WatchProvider[];
  free?: WatchProvider[];
  ads?: WatchProvider[];
};

export type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

function videoScore(video: TmdbVideo, preferredLanguage?: string | null): number {
  const type = video.type ?? "";
  const language = video.iso_639_1 ?? null;
  const name = (video.name ?? "").toLowerCase();
  const preferred = preferredLanguage?.toLowerCase() ?? null;

  let score = 0;
  if (type === "Trailer") score += 60;
  else if (type === "Teaser") score += 42;
  else if (type === "Clip") score += 18;
  else if (type === "Featurette") score += 12;

  if (video.official) score += 10;
  if (name.includes("official trailer")) score += 8;
  else if (name.includes("trailer")) score += 4;

  if (preferred && language === preferred) score += 24;
  else if (language === "en") score += 18;
  else if (!language) score += 10;

  return score;
}

export function rankTrailerKeys(videos: TmdbVideo[] = [], preferredLanguage?: string | null): string[] {
  return [...new Set(videos
    .filter(video => video.site === "YouTube" && /^[a-zA-Z0-9_-]{11}$/.test(video.key ?? "")
      && (video.type === "Trailer" || video.type === "Teaser"))
    .sort((a, b) => videoScore(b, preferredLanguage) - videoScore(a, preferredLanguage)
      || (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .map(video => video.key!))].slice(0, 5);
}

export function pickBestVideo(videos: TmdbVideo[] = [], preferredLanguage?: string | null): TmdbVideo | null {
  const key = rankTrailerKeys(videos, preferredLanguage)[0];
  return videos.find(video => video.key === key) ?? null;
}

export function pickBestLogo(logos: Logo[] = [], preferredLanguage?: string | null): string | null {
  const preferred = preferredLanguage?.toLowerCase() ?? null;
  const scored = logos
    .filter((logo) => logo.file_path)
    .map((logo) => {
      const language = logo.iso_639_1 ?? null;
      let score = 0;
      if (language === "en") score += 40;
      else if (!language) score += 30;
      else if (preferred && language === preferred) score += 20;
      score += logo.vote_average ?? 0;
      score += (logo.vote_count ?? 0) / 10;
      return { logo, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.logo.file_path ?? null;
}

export async function findTrailerKeys(
  mediaType: MediaType,
  id: string,
  videos: TmdbVideo[] = [],
  originalLanguage?: string | null,
): Promise<string[]> {
  const keys = rankTrailerKeys(videos, originalLanguage);
  if (keys.length || !originalLanguage || originalLanguage === "en") return keys;
  const localized = await tmdbFetch<{ results?: TmdbVideo[] }>(
    `/${mediaType}/${id}/videos`,
    { language: originalLanguage, include_video_language: `en,null,${originalLanguage}` },
    { revalidate: CACHE.day },
  );
  return rankTrailerKeys(localized.results ?? [], originalLanguage);
}

export async function findBestTrailerKey(
  mediaType: MediaType, id: string, videos: TmdbVideo[] = [], originalLanguage?: string | null,
): Promise<string | null> {
  return (await findTrailerKeys(mediaType, id, videos, originalLanguage))[0] ?? null;
}

// Use exactly the same request for heroes, previews and detail pages so they
// share the persistent Next fetch cache as well as concurrent requests.
export function getMediaBundle(mediaType: MediaType, id: string) {
  if (!/^[1-9]\d{0,9}$/.test(id)) throw new TmdbError(404, "Title not found.");
  return tmdbFetch(`/${mediaType}/${id}`, {
    append_to_response: "videos,credits,images",
    include_image_language: "en,null",
    include_video_language: "en,null",
  }, { revalidate: CACHE.day });
}

export const getCachedMediaDetails = cache(
  (mediaType: MediaType, id: string) => getEnhancedMediaDetails(mediaType, id),
);

export async function getEnhancedMediaDetails(mediaType: MediaType, id: string) {
  const data = await getMediaBundle(mediaType, id);
  const originalLanguage = typeof data.original_language === "string" ? data.original_language : null;
  const initialLogos: Logo[] = data.images?.logos ?? [];
  let partial = data.videos?.success === false || data.credits?.success === false || data.images?.success === false;
  // Only widen a genuine miss. Do not repeat the identical English query.
  const [logos, trailerKeys] = await Promise.all([
    pickBestLogo(initialLogos, originalLanguage)
      ? Promise.resolve(initialLogos)
      : tmdbFetch<{ logos?: Logo[] }>(`/${mediaType}/${id}/images`, { language: null }, { revalidate: CACHE.day })
        .then(images => images.logos ?? initialLogos).catch(() => { partial = true; return initialLogos; }),
    findTrailerKeys(mediaType, id, data.videos?.results ?? [], originalLanguage)
      .catch(() => { partial = true; return []; }),
  ]);
  const details = { ...data };
  delete details.videos;
  delete details.credits;
  delete details.images;
  return {
    data: details,
    credits: data.credits,
    logo: pickBestLogo(logos, originalLanguage),
    trailerKey: trailerKeys[0] ?? null,
    trailerKeys,
    partial,
  };
}

function providerBaseName(name: string) {
  return name.toLowerCase().replace(/ (with ads|basic|free|standard).*$/, "").trim();
}

export function pickProviderRegion(
  results: Record<string, ProviderRegion> | null | undefined,
  requestedRegion: string,
) {
  if (!results) return { region: requestedRegion, data: null, fallback: false };

  return {
    region: requestedRegion,
    data: results[requestedRegion] ?? null,
    fallback: false,
  };
}

export function streamingProviders(regionData: ProviderRegion | null | undefined, limit = 5): WatchProvider[] {
  const flatrate = regionData?.flatrate ?? [];
  const free = [...(regionData?.free ?? []), ...(regionData?.ads ?? [])];
  const flatrateBaseNames = new Set(flatrate.map((provider) => providerBaseName(provider.provider_name)));
  const dedupedFree = free.filter((provider) => !flatrateBaseNames.has(providerBaseName(provider.provider_name)));
  const seen = new Set<number>();

  return [...flatrate, ...dedupedFree]
    .filter((provider) => {
      if (seen.has(provider.provider_id)) return false;
      seen.add(provider.provider_id);
      return true;
    })
    .slice(0, limit);
}
