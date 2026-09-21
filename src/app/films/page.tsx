import BrowseFeed from "@/components/BrowseFeed";
import { tmdbFetch } from "@/lib/tmdb";
import type { Metadata } from "next";
import MoviesHero from "@/components/MoviesHero";
import { GENRE_NAMES } from "@/lib/genres";
import { APP_NAME } from "@/lib/app-name";

export const metadata: Metadata = {
  title: "Films",
  description:
    `Explore popular, upcoming, top-rated, international, and films by genre with trailers, cast, ratings, and recommendations on ${APP_NAME}.`,
  alternates: { canonical: "/films" },
  openGraph: {
    title: `Films | ${APP_NAME}`,
    description:
      `Explore popular, upcoming, top-rated, international, and films by genre with trailers, cast, ratings, and recommendations on ${APP_NAME}.`,
    url: "/films",
  },
};
export const revalidate = 3600;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasBackdrop(m: any): boolean {
  return Boolean(m?.backdrop_path);
}

/* The hero must never come back empty. TMDB drops the occasional request
   ("TypeError: fetch failed"), and with `revalidate` above, one blip would
   otherwise be cached as a heroless page for the next hour — the state you
   can only escape by reloading until a fetch happens to succeed. So: retry
   once, then fall back to popular titles rather than hand back nothing. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function heroTitles(params: Record<string, string>): Promise<any[]> {
  const attempt = async (endpoint: string, p: Record<string, string>) => {
    try {
      const data = await tmdbFetch(endpoint, p, { revalidate: 3600 });
      return (data?.results ?? []).filter(hasBackdrop).slice(0, 8);
    } catch (e) {
      console.error(`[movie hero] ${endpoint} failed`, e);
      return [];
    }
  };

  for (let i = 0; i < 2; i++) {
    const list = await attempt("/discover/movie", params);
    if (list.length) return list;
  }
  return attempt("/movie/popular", {});
}

type Props = { searchParams: Promise<{ genre?: string }> };

export default async function MoviesPage({ searchParams }: Props) {
  const { genre } = await searchParams;

  // `genre` is a comma-separated id list ("28,27" = Action *and* Horror),
  // which is exactly the format TMDB's with_genres takes. Junk ids are
  // dropped; if nothing survives we fall through to the unfiltered page.
  const genreIds = (genre ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));

  // ── Same /movie layout, but every reel scoped to the selected genres ──
  if (genreIds.length) {
    const g = genreIds.join(",");
    const genreName = genreIds
      .map((id) => GENRE_NAMES[id] ?? "Genre")
      .join(" + ");
    const heroMovies = await heroTitles({
      with_genres: g,
      sort_by: "popularity.desc",
    });
    return (
      <div className="min-h-screen bg-[#010101] text-white">
          <MoviesHero initialMovies={heroMovies} genreId={g} genreName={genreName} />

        <BrowseFeed key={g} mediaType="movie" genre={g} />
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

  // Both calls above dropped — retry rather than ship a heroless page.
  const heroMovies = movies.length ? movies : await heroTitles({});

  return (
    <div className="min-h-screen bg-[#010101] text-white">
      <MoviesHero initialMovies={heroMovies} />

      <BrowseFeed mediaType="movie" />
    </div>
  );
}
