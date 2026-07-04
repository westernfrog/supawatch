import type { Metadata } from "next";
import Hero from "@/components/Hero";
import MediaGrid from "@/components/MediaGrid";
import ShowReel from "@/components/ShowReel";
import ScrollSnap from "@/components/ScrollSnap";
import ForYou from "@/components/ForYou";
import DaypartRow from "@/components/DaypartRow";
import RegionalRows from "@/components/RegionalRows";
import { buildDailyProgram } from "@/lib/programming";

export const metadata: Metadata = {
  title: "Explore Movies, TV Series, Trailers & Live Channels",
  description:
    "Browse trending movies and TV series, international cinema, trailers, cast details, ratings, recommendations, and live channels on Supawatch.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Supawatch - Explore Movies, TV Series, Trailers & Live Channels",
    description:
      "Browse trending movies and TV series, international cinema, trailers, cast details, ratings, recommendations, and live channels on Supawatch.",
    url: "/",
  },
};

/* Re-render hourly so the date-seeded lineup below flips at midnight
   without a deploy. */
export const revalidate = 3600;

export default function Home() {
  /* Curated pools shuffled by today's date — a fresh schedule every day. */
  const program = buildDailyProgram();

  return (
    <>
      <ScrollSnap />
      <Hero />

      {/* ── Live & Now — always on, always current ── */}
      <MediaGrid title="Trending Today"     subtitle="Right Now"         fetchUrl="/api/getTrending?window=day" limit={12} />
      <ShowReel  title="In Theaters"        subtitle="Now Playing"       fetchUrl="/api/getMovieList?list=now_playing" mediaType="movie" />
      <ShowReel  title="On TV Tonight"      subtitle="Airing Today"      fetchUrl="/api/getTvList?list=airing_today" mediaType="tv" />

      {/* ── Personalized — built from the on-device taste profile;
             invisible until the visitor has interacted with titles ── */}
      <ForYou />

      {/* ── Programmed to the viewer's local clock ── */}
      <DaypartRow />

      {/* ── Seasoned by the viewer's country — a local accent, not a takeover ── */}
      <RegionalRows />

      <ShowReel  title="Coming Soon"        subtitle="Upcoming Releases" fetchUrl="/api/getMovieList?list=upcoming" mediaType="movie" />
      <MediaGrid title="Trending This Week" subtitle="This Week"         fetchUrl="/api/getTrending?window=week" limit={12} />

      {/* ── The Gold Standard — evergreen prestige ── */}
      <ShowReel  title="Hall of Fame" subtitle="Rated 8.0 +"     fetchUrl="/api/getDiscover?type=mixed&sort_by=vote_average.desc&vote_average_gte=8.0&vote_count_gte=5000" />
      <ShowReel  title="Prestige TV"  subtitle="Peak Television" fetchUrl="/api/getDiscover?type=tv&sort_by=vote_average.desc&vote_average_gte=8.0&vote_count_gte=1000" mediaType="tv" />
      <MediaGrid title="Box Office"   subtitle="Biggest Hits"    fetchUrl="/api/getDiscover?type=movie&sort_by=revenue.desc&vote_count_gte=500" mediaType="movie" />

      {/* ── Today's rotation — moods, decades, world cinema, networks,
             seasonal specials; reshuffled daily by date-seeded pick ── */}
      {program.map((section) =>
        section.kind === "reel" ? (
          <ShowReel
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
            fetchUrl={section.url}
            mediaType={section.mediaType}
          />
        ) : (
          <MediaGrid
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
            fetchUrl={section.url}
            mediaType={section.mediaType}
          />
        ),
      )}
    </>
  );
}
