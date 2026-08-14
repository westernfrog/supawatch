import { tmdbFetch } from "@/lib/tmdb";
import type { Metadata } from "next";
import TvHero from "@/components/TvHero";
import MediaGrid from "@/components/MediaGrid";
import ShowReel from "@/components/ShowReel";
import ScrollSnap from "@/components/ScrollSnap";
import { GENRE_NAMES } from "@/lib/genres";

export const metadata: Metadata = {
  title: "TV Series",
  description:
    "Explore trending, top-rated, airing, international, animated, and network TV series with trailers, seasons, cast, and recommendations on Supawatch.",
  alternates: { canonical: "/tv" },
  openGraph: {
    title: "TV Series | Supawatch",
    description:
      "Explore trending, top-rated, airing, international, animated, and network TV series with trailers, seasons, cast, and recommendations on Supawatch.",
    url: "/tv",
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
    const genreName = genreIds
      .map((id) => GENRE_NAMES[id] ?? "Genre")
      .join(" + ");
    const heroShows = await heroTitles({
      with_genres: g,
      sort_by: "popularity.desc",
    });
    const D = (params: string) =>
      `/api/getDiscover?type=tv&with_genres=${g}&${params}`;

    return (
      <div className="min-h-screen bg-[#010101] text-white">
        <ScrollSnap />
        <TvHero initialShows={heroShows} genreId={g} />

        <ShowReel  title={`Popular ${genreName}`} subtitle="Right Now"    fetchUrl={D("sort_by=popularity.desc")} mediaType="tv" />
        <MediaGrid title="Top Rated"              subtitle="Acclaimed"    fetchUrl={D("sort_by=vote_average.desc&vote_count_gte=200")} mediaType="tv" />
        <ShowReel  title="Fan Favorites"          subtitle="Most Watched" fetchUrl={D("sort_by=vote_count.desc")} mediaType="tv" />
        <ShowReel  title="Fresh Episodes"         subtitle="Newest First" fetchUrl={D("sort_by=first_air_date.desc&vote_count_gte=20")} mediaType="tv" />
        <MediaGrid title="Hidden Gems"            subtitle="Underrated"   fetchUrl={D("sort_by=vote_average.desc&vote_count_gte=50")} mediaType="tv" />
        <ShowReel  title={`${genreName} Movies`}  subtitle="On Film"      fetchUrl={`/api/getDiscover?type=movie&with_genres=${g}&sort_by=popularity.desc`} mediaType="movie" />
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
      <ScrollSnap />
      <TvHero initialShows={heroShows} />

      {/* ── On air ── */}
      <ShowReel  title="On TV Tonight"     subtitle="Airing Today"      fetchUrl="/api/getTvList?list=airing_today" mediaType="tv" />
      <ShowReel  title="On The Air"        subtitle="Currently Airing"  fetchUrl="/api/getTvList?list=on_the_air" mediaType="tv" />
      <MediaGrid title="Popular"           subtitle="Right Now"         fetchUrl="/api/getTvList?list=popular" mediaType="tv" />

      {/* ── Acclaimed ── */}
      <ShowReel  title="Prestige TV"       subtitle="Rated 8.0 +"       fetchUrl="/api/getDiscover?type=tv&sort_by=vote_average.desc&vote_average_gte=8.0&vote_count_gte=1000" />
      <MediaGrid title="Top Rated"         subtitle="All Time"          fetchUrl="/api/getTvList?list=top_rated" mediaType="tv" />

      {/* ── Premium Networks ── */}
      <ShowReel  title="HBO"               subtitle="Premium Cable"     fetchUrl="/api/getDiscover?type=tv&with_networks=49&sort_by=popularity.desc" />
      <ShowReel  title="Netflix"           subtitle="Original Series"   fetchUrl="/api/getDiscover?type=tv&with_networks=213&sort_by=popularity.desc" />
      <MediaGrid title="Apple TV+"         subtitle="Originals"         fetchUrl="/api/getDiscover?type=tv&with_networks=2552&sort_by=popularity.desc" />
      <ShowReel  title="Amazon Prime"      subtitle="Prime Video"       fetchUrl="/api/getDiscover?type=tv&with_networks=1024&sort_by=popularity.desc" />

      {/* ── Genre ── */}
      <ShowReel  title="Crime & Thriller"  subtitle="Dark & Gripping"   fetchUrl="/api/getDiscover?type=tv&with_genres=80&sort_by=vote_average.desc&vote_count_gte=500" />
      <MediaGrid title="Sci-Fi & Fantasy"  subtitle="Beyond Reality"    fetchUrl="/api/getDiscover?type=tv&with_genres=10765&sort_by=popularity.desc" />
      <ShowReel  title="Mystery"           subtitle="Keep Guessing"     fetchUrl="/api/getDiscover?type=tv&with_genres=9648&sort_by=vote_average.desc&vote_count_gte=300" />
      <MediaGrid title="Drama"             subtitle="Human Stories"     fetchUrl="/api/getDiscover?type=tv&with_genres=18&sort_by=vote_average.desc&vote_count_gte=500" />
      <ShowReel  title="Documentary"       subtitle="Unscripted Truth"  fetchUrl="/api/getDiscover?type=tv&with_genres=99&sort_by=vote_average.desc&vote_count_gte=200" />
      <MediaGrid title="Reality"           subtitle="Unscripted"        fetchUrl="/api/getDiscover?type=tv&with_genres=10764&sort_by=popularity.desc" />

      {/* ── International ── */}
      <ShowReel  title="Korean Wave"       subtitle="K-Drama"           fetchUrl="/api/getDiscover?type=tv&language=ko&sort_by=popularity.desc" />
      <MediaGrid title="Anime"             subtitle="Japanese Animation" fetchUrl="/api/getDiscover?type=tv&language=ja&with_genres=16&sort_by=popularity.desc" />
      <ShowReel  title="Nordic Noir"       subtitle="Scandinavian Dark" fetchUrl="/api/getDiscover?type=tv&language=da&sort_by=popularity.desc" />
      <MediaGrid title="Spanish Series"    subtitle="Español"           fetchUrl="/api/getDiscover?type=tv&language=es&sort_by=popularity.desc" />
    </div>
  );
}
