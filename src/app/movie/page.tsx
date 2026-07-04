import { tmdbFetch } from "@/lib/tmdb";
import type { Metadata } from "next";
import MoviesHero from "@/components/MoviesHero";
import MediaGrid from "@/components/MediaGrid";
import ShowReel from "@/components/ShowReel";
import ScrollSnap from "@/components/ScrollSnap";
import { GENRE_NAMES } from "@/lib/genres";

export const metadata: Metadata = {
  title: "Movies",
  description:
    "Explore popular, upcoming, top-rated, international, and genre-based movies with trailers, cast, ratings, and recommendations on Supawatch.",
  alternates: { canonical: "/movie" },
  openGraph: {
    title: "Movies | Supawatch",
    description:
      "Explore popular, upcoming, top-rated, international, and genre-based movies with trailers, cast, ratings, and recommendations on Supawatch.",
    url: "/movie",
  },
};
export const revalidate = 3600;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasBackdrop(m: any): boolean {
  return Boolean(m?.backdrop_path);
}

type Props = { searchParams: Promise<{ genre?: string }> };

export default async function MoviesPage({ searchParams }: Props) {
  const { genre } = await searchParams;

  // ── Same /movie layout, but every reel scoped to one genre ──
  if (genre) {
    const g = genre;
    const genreName = GENRE_NAMES[g] ?? "Genre";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let heroMovies: any[] = [];
    try {
      const data = await tmdbFetch(
        "/discover/movie",
        { with_genres: g, sort_by: "popularity.desc" },
        { revalidate: 3600 },
      );
      heroMovies = (data?.results ?? []).filter(hasBackdrop).slice(0, 8);
    } catch {
      // MoviesHero handles an empty list gracefully
    }
    const D = (params: string) => `/api/getDiscover?type=movie&with_genres=${g}&${params}`;
    return (
      <div className="min-h-screen bg-[#010101] text-white">
        <ScrollSnap />
        <MoviesHero initialMovies={heroMovies} genreId={g} genreName={genreName} />

        <ShowReel  title={`Popular ${genreName}`} subtitle="Right Now"       fetchUrl={D("sort_by=popularity.desc")} mediaType="movie" />
        <MediaGrid title="Top Rated"              subtitle="Acclaimed"       fetchUrl={D("sort_by=vote_average.desc&vote_count_gte=300")} mediaType="movie" />
        <ShowReel  title="Box Office"             subtitle="Biggest Hits"    fetchUrl={D("sort_by=revenue.desc&vote_count_gte=200")} mediaType="movie" />
        <ShowReel  title="Fresh Releases"         subtitle="Newest First"    fetchUrl={D("sort_by=primary_release_date.desc&vote_count_gte=50")} mediaType="movie" />
        <MediaGrid title="Hidden Gems"            subtitle="Underrated"      fetchUrl={D("sort_by=vote_average.desc&vote_count_gte=100")} mediaType="movie" />
        <ShowReel  title="Fan Favorites"          subtitle="Most Watched"    fetchUrl={D("sort_by=vote_count.desc")} mediaType="movie" />
        <ShowReel  title={`${genreName} on TV`}   subtitle="Series"          fetchUrl={`/api/getDiscover?type=tv&with_genres=${g}&sort_by=popularity.desc`} mediaType="tv" />
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nowPlaying: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let popular: any[] = [];

  try {
    const [npData, popData] = await Promise.all([
      tmdbFetch("/movie/now_playing", {}, { revalidate: 3600 }),
      tmdbFetch("/movie/popular", {}, { revalidate: 3600 }),
    ]);
    nowPlaying = npData?.results ?? [];
    popular = popData?.results ?? [];
  } catch {
    // render with empty list — MoviesHero handles it gracefully
  }

  const seen = new Set<number>();
  const movies = [...nowPlaying, ...popular]
    .filter((m) => hasBackdrop(m) && !seen.has(m.id) && seen.add(m.id))
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-[#010101] text-white">
      <ScrollSnap />
      <MoviesHero initialMovies={movies} />

      {/* ── In cinemas ── */}
      <ShowReel  title="In Theaters"       subtitle="Now Playing"       fetchUrl="/api/getMovieList?list=now_playing" mediaType="movie" />
      <ShowReel  title="Coming Soon"       subtitle="Upcoming Releases" fetchUrl="/api/getMovieList?list=upcoming" mediaType="movie" />
      <MediaGrid title="Popular"           subtitle="Right Now"         fetchUrl="/api/getMovieList?list=popular" mediaType="movie" />

      {/* ── Acclaimed ── */}
      <ShowReel  title="Hall of Fame"      subtitle="Rated 8.0 +"       fetchUrl="/api/getDiscover?type=movie&sort_by=vote_average.desc&vote_average_gte=8.0&vote_count_gte=5000" mediaType="movie" />
      <MediaGrid title="Top Rated"         subtitle="All Time"          fetchUrl="/api/getMovieList?list=top_rated" mediaType="movie" />
      <ShowReel  title="Box Office"        subtitle="Biggest Hits"      fetchUrl="/api/getDiscover?type=movie&sort_by=revenue.desc&vote_count_gte=500" mediaType="movie" />

      {/* ── By decade ── */}
      <ShowReel  title="80s Classics"      subtitle="Totally Rad"       fetchUrl="/api/getDiscover?type=movie&year_from=1980&year_to=1989&sort_by=vote_average.desc&vote_count_gte=500" mediaType="movie" />
      <MediaGrid title="90s Nostalgia"     subtitle="Golden Era"        fetchUrl="/api/getDiscover?type=movie&year_from=1990&year_to=1999&sort_by=vote_average.desc&vote_count_gte=1000" mediaType="movie" />
      <ShowReel  title="2000s Throwback"   subtitle="Early Millennium"  fetchUrl="/api/getDiscover?type=movie&year_from=2000&year_to=2009&sort_by=vote_average.desc&vote_count_gte=1000" mediaType="movie" />

      {/* ── Genre ── */}
      <ShowReel  title="Superhero"         subtitle="Marvel · DC · More" fetchUrl="/api/getDiscover?type=movie&with_keywords=9715&sort_by=popularity.desc" mediaType="movie" />
      <MediaGrid title="Action"            subtitle="All Out"           fetchUrl="/api/getDiscover?type=movie&with_genres=28&sort_by=popularity.desc" mediaType="movie" />
      <ShowReel  title="After Dark"        subtitle="Horror"            fetchUrl="/api/getDiscover?type=movie&with_genres=27&sort_by=vote_average.desc&vote_count_gte=500" mediaType="movie" />
      <MediaGrid title="Thriller"          subtitle="Edge of Your Seat" fetchUrl="/api/getDiscover?type=movie&with_genres=53&sort_by=popularity.desc" mediaType="movie" />
      <ShowReel  title="Spy & Espionage"   subtitle="Secret Missions"   fetchUrl="/api/getDiscover?type=movie&with_keywords=10249&sort_by=popularity.desc" mediaType="movie" />
      <MediaGrid title="Drama"             subtitle="Human Stories"     fetchUrl="/api/getDiscover?type=movie&with_genres=18&sort_by=vote_average.desc&vote_count_gte=500" mediaType="movie" />
      <ShowReel  title="Documentary"       subtitle="Unscripted Truth"  fetchUrl="/api/getDiscover?type=movie&with_genres=99&sort_by=vote_average.desc&vote_count_gte=200" mediaType="movie" />

      {/* ── International ── */}
      <ShowReel  title="Bollywood"         subtitle="Hindi Cinema"      fetchUrl="/api/getDiscover?type=movie&language=hi&sort_by=popularity.desc" mediaType="movie" />
      <MediaGrid title="French Cinema"     subtitle="Cinéma Français"   fetchUrl="/api/getDiscover?type=movie&language=fr&sort_by=popularity.desc" mediaType="movie" />
      <ShowReel  title="Korean Cinema"     subtitle="K-Film"            fetchUrl="/api/getDiscover?type=movie&language=ko&sort_by=popularity.desc" mediaType="movie" />
    </div>
  );
}
