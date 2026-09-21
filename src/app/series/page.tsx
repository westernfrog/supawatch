import BrowseFeed from "@/components/BrowseFeed";
import { tmdbFetch } from "@/lib/tmdb";
import type { Metadata } from "next";
import TvHero from "@/components/TvHero";
import { APP_NAME } from "@/lib/app-name";

export const metadata: Metadata = {
  title: "Series",
  description:
    `Explore trending, top-rated, airing, international, animated, and network series with trailers, seasons, cast, and recommendations on ${APP_NAME}.`,
  alternates: { canonical: "/series" },
  openGraph: {
    title: `Series | ${APP_NAME}`,
    description:
      `Explore trending, top-rated, airing, international, animated, and network series with trailers, seasons, cast, and recommendations on ${APP_NAME}.`,
    url: "/series",
  },
};
export const revalidate = 3600;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasBackdrop(m: any): boolean {
  return Boolean(m?.backdrop_path);
}

/* The hero must never come back empty — TMDB drops the odd request, and with
   `revalidate` above one blip would be cached as a heroless page for the hour.
   Retry, then fall back to popular shows rather than hand back nothing. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function heroTitles(params: Record<string, string>): Promise<any[]> {
  const attempt = async (endpoint: string, p: Record<string, string>) => {
    try {
      const data = await tmdbFetch(endpoint, p, { revalidate: 3600 });
      return (data?.results ?? []).filter(hasBackdrop).slice(0, 8);
    } catch (e) {
      console.error(`[tv hero] ${endpoint} failed`, e);
      return [];
    }
  };

  for (let i = 0; i < 2; i++) {
    const list = await attempt("/discover/tv", params);
    if (list.length) return list;
  }
  return attempt("/tv/popular", {});
}

type Props = { searchParams: Promise<{ genre?: string }> };

export default async function TvPage({ searchParams }: Props) {
  const { genre } = await searchParams;

  // Comma-separated id list ("18,80" = Drama *and* Crime), the format TMDB's
  // with_genres takes. Junk ids are dropped; if none survive, no filter.
  const genreIds = (genre ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));

  // ── Same /tv layout, but every reel scoped to the selected genres ──
  if (genreIds.length) {
    const g = genreIds.join(",");
    const heroShows = await heroTitles({
      with_genres: g,
      sort_by: "popularity.desc",
    });
    return (
      <div className="min-h-screen bg-[#010101] text-white">
          <TvHero initialShows={heroShows} genreId={g} />

        <BrowseFeed key={g} mediaType="tv" genre={g} />
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onAir: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let popular: any[] = [];

  try {
    const [onAirData, popularData] = await Promise.all([
      tmdbFetch("/tv/on_the_air", {}, { revalidate: 3600 }),
      tmdbFetch("/tv/popular", {}, { revalidate: 3600 }),
    ]);
    onAir = onAirData?.results ?? [];
    popular = popularData?.results ?? [];
  } catch {
    // TvHero handles empty array gracefully
  }

  const seen = new Set<number>();
  const shows = [...onAir, ...popular]
    .filter((s) => hasBackdrop(s) && !seen.has(s.id) && seen.add(s.id))
    .slice(0, 8);

  // Both calls above dropped — retry rather than ship a heroless page.
  const heroShows = shows.length ? shows : await heroTitles({});

  return (
    <div className="min-h-screen bg-[#010101] text-white">
      <TvHero initialShows={heroShows} />

      <BrowseFeed mediaType="tv" />
    </div>
  );
}
