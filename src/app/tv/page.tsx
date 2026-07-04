import { tmdbFetch } from "@/lib/tmdb";
import type { Metadata } from "next";
import TvHero from "@/components/TvHero";
import MediaGrid from "@/components/MediaGrid";
import ShowReel from "@/components/ShowReel";
import ScrollSnap from "@/components/ScrollSnap";

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

export default async function TvPage() {
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

  return (
    <div className="min-h-screen bg-[#010101] text-white">
      <ScrollSnap />
      <TvHero initialShows={shows} />

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
