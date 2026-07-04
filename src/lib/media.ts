import { cache } from "react";
import { CACHE, tmdbFetch } from "@/lib/tmdb";

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

const DEFAULT_COUNTRY_BY_LANGUAGE: Record<string, string> = {
  ar: "SA",
  da: "DK",
  de: "DE",
  es: "ES",
  fr: "FR",
  hi: "IN",
  id: "ID",
  it: "IT",
  ja: "JP",
  kn: "IN",
  ko: "KR",
  ml: "IN",
  no: "NO",
  pt: "BR",
  ru: "RU",
  sv: "SE",
  ta: "IN",
  te: "IN",
  th: "TH",
  tr: "TR",
  zh: "CN",
};

const PROVIDER_REGION_FALLBACKS = ["US", "GB", "CA", "AU", "IN"];

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function firstCountry(countries: unknown): string | null {
  if (!Array.isArray(countries)) return null;
  return countries.find((country) => typeof country === "string" && /^[A-Z]{2}$/.test(country)) ?? null;
}

function productionCountries(countries: unknown): string[] {
  if (!Array.isArray(countries)) return [];
  return countries
    .map((country) => {
      if (typeof country === "string") return country;
      if (country && typeof country === "object" && "iso_3166_1" in country) {
        const code = (country as { iso_3166_1?: unknown }).iso_3166_1;
        return typeof code === "string" ? code : null;
      }
      return null;
    })
    .filter((country): country is string => Boolean(country && /^[A-Z]{2}$/.test(country)));
}

function videoLanguageTags(language: string | null | undefined, countries: string[] = []): string[] {
  const lang = language?.toLowerCase();
  if (!lang || lang === "en" || !/^[a-z]{2,3}$/.test(lang)) return [];

  const preferredCountry = firstCountry(countries) ?? DEFAULT_COUNTRY_BY_LANGUAGE[lang];
  return unique([
    preferredCountry ? `${lang}-${preferredCountry}` : "",
    lang,
  ]);
}

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

export function pickBestVideo(videos: TmdbVideo[] = [], preferredLanguage?: string | null): TmdbVideo | null {
  return videos
    .filter((video) => video.site === "YouTube" && video.key)
    .sort((a, b) => {
      const score = videoScore(b, preferredLanguage) - videoScore(a, preferredLanguage);
      if (score !== 0) return score;
      return (b.published_at ?? "").localeCompare(a.published_at ?? "");
    })[0] ?? null;
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

async function fetchLocalizedVideos(mediaType: MediaType, id: string, originalLanguage: string | null, countries: string[]) {
  const tags = videoLanguageTags(originalLanguage, countries);
  const results: TmdbVideo[] = [];

  for (const language of tags) {
    const data = await tmdbFetch<{ results?: TmdbVideo[] }>(
      `/${mediaType}/${id}/videos`,
      { language },
      { revalidate: CACHE.day },
    ).catch(() => null);

    if (data?.results?.length) results.push(...data.results);
    if (pickBestVideo(results, originalLanguage)) break;
  }

  return results;
}


export async function findBestTrailerKey(
  mediaType: MediaType,
  id: string,
  videos: TmdbVideo[] = [],
  originalLanguage?: string | null,
  countries: string[] = [],
): Promise<string | null> {
  let trailerVideo = pickBestVideo(videos, originalLanguage);

  if (!trailerVideo && originalLanguage && originalLanguage !== "en") {
    const localizedVideos = await fetchLocalizedVideos(mediaType, id, originalLanguage, countries);
    trailerVideo = pickBestVideo([...videos, ...localizedVideos], originalLanguage);
  }

  return trailerVideo?.key ?? null;
}

/* Per-request memo of getEnhancedMediaDetails so generateMetadata and the
   page component share one TMDB round trip instead of fetching twice. */
export const getCachedMediaDetails = cache(
  (mediaType: MediaType, id: string) => getEnhancedMediaDetails(mediaType, id),
);

export async function getEnhancedMediaDetails(mediaType: MediaType, id: string) {
  const [data, imagesData] = await Promise.all([
    tmdbFetch(
      `/${mediaType}/${id}`,
      { append_to_response: "videos,credits", include_video_language: "en,null" },
      { revalidate: CACHE.hour },
    ),
    tmdbFetch<{ logos?: Logo[] }>(
      `/${mediaType}/${id}/images`,
      { include_image_language: "en,null" },
      { revalidate: CACHE.hour },
    ),
  ]);

  const originalLanguage = typeof data.original_language === "string" ? data.original_language : null;
  const countries = mediaType === "tv" ? productionCountries(data.origin_country) : productionCountries(data.production_countries);

  let logos = imagesData?.logos ?? [];
  if (!pickBestLogo(logos, originalLanguage) && originalLanguage && originalLanguage !== "en") {
    const widerImages = await tmdbFetch<{ logos?: Logo[] }>(
      `/${mediaType}/${id}/images`,
      { include_image_language: `en,null,${originalLanguage}` },
      { revalidate: CACHE.day },
    ).catch(() => null);
    logos = widerImages?.logos ?? logos;
  }

  const videos: TmdbVideo[] = data.videos?.results ?? [];
  const trailerKey = await findBestTrailerKey(mediaType, id, videos, originalLanguage, countries);

  const credits = data.credits;
  const details = { ...data };
  delete details.videos;
  delete details.credits;

  return {
    data: details,
    credits,
    logo: pickBestLogo(logos, originalLanguage),
    trailerKey,
  };
}

function providerBaseName(name: string) {
  return name.toLowerCase().replace(/ (with ads|basic|free|standard).*$/, "").trim();
}

function hasStreamingProviders(region?: ProviderRegion | null) {
  return Boolean(region?.flatrate?.length || region?.free?.length || region?.ads?.length);
}

export function pickProviderRegion(
  results: Record<string, ProviderRegion> | null | undefined,
  requestedRegion: string,
) {
  if (!results) return { region: requestedRegion, data: null, fallback: false };

  const ordered = unique([
    requestedRegion,
    ...PROVIDER_REGION_FALLBACKS,
    ...Object.keys(results).sort(),
  ]);
  const region = ordered.find((code) => hasStreamingProviders(results[code])) ?? requestedRegion;

  return {
    region,
    data: results[region] ?? null,
    fallback: region !== requestedRegion,
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
