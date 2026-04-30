import MediaCarousel from "./components/MediaCarousel";
import Overview from "./components/Overview";

// TMDB Genre IDs (movie)
// Action:28 | Adventure:12 | Animation:16 | Comedy:35 | Crime:80
// Drama:18 | Fantasy:14 | Horror:27 | Mystery:9648 | Romance:10749
// Sci-Fi:878 | Thriller:53 | War:10752
// TMDB Genre IDs (tv)
// Action&Adventure:10759 | Animation:16 | Comedy:35 | Crime:80
// Drama:18 | Kids:10762 | Mystery:9648 | Sci-Fi&Fantasy:10765

export default function Home() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <Overview />

      {/* ── Standard lists ──────────────────────────────────── */}
      <MediaCarousel
        title="Now Playing"
        apiEndpoint="/api/getMovieList?list=now_playing&page=1"
        linkPrefix="/movie"
        mediaType="movie"
        hideSeeAll={true}
      />

      <MediaCarousel
        title="Popular Movies"
        apiEndpoint="/api/getMovieList?list=popular&page=1"
        linkPrefix="/movie"
        mediaType="movie"
        seeAllLink="/popular"
      />

      {/* Discover: Critically Acclaimed Thrillers */}
      <MediaCarousel
        title="Critically Acclaimed Thrillers"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=53,9648&sort_by=vote_average.desc&vote_count.gte=2000"
        linkPrefix="/movie"
        mediaType="movie"
        hideSeeAll={true}
      />

      {/* Discover: Award-Winning Dramas */}
      <MediaCarousel
        title="Award-Winning Dramas"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=18&sort_by=vote_average.desc&vote_count.gte=3000"
        linkPrefix="/movie"
        mediaType="movie"
        hideSeeAll={true}
      />

      <MediaCarousel
        title="Upcoming Movies"
        apiEndpoint="/api/getMovieList?list=upcoming&page=1"
        linkPrefix="/movie"
        mediaType="movie"
        hideSeeAll={true}
      />

      {/* Discover: Sci-Fi & Adventure */}
      <MediaCarousel
        title="Sci-Fi & Space Adventures"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=878,12&sort_by=popularity.desc&vote_count.gte=500"
        linkPrefix="/movie"
        mediaType="movie"
        hideSeeAll={true}
      />

      {/* Discover: Action Blockbusters */}
      <MediaCarousel
        title="Action Blockbusters"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=28,12&sort_by=popularity.desc&vote_count.gte=1000"
        linkPrefix="/movie"
        mediaType="movie"
        hideSeeAll={true}
      />

      <MediaCarousel
        title="Top Rated Movies"
        apiEndpoint="/api/getMovieList?list=top_rated&page=1"
        linkPrefix="/movie"
        mediaType="movie"
        seeAllLink="/top-rated"
      />

      <MediaCarousel
        title="Popular TV Series"
        apiEndpoint="/api/getTVList?list=popular&page=1"
        linkPrefix="/tv"
        mediaType="tv"
        hideSeeAll={true}
      />

      {/* Discover: Binge-Worthy Crime Dramas */}
      <MediaCarousel
        title="Binge-Worthy Crime Dramas"
        apiEndpoint="/api/getDiscover?type=tv&with_genres=80,18&sort_by=vote_average.desc&vote_count.gte=500"
        linkPrefix="/tv"
        mediaType="tv"
        hideSeeAll={true}
      />

      {/* Discover: Anime */}
      <MediaCarousel
        title="Anime"
        apiEndpoint="/api/getDiscover?type=tv&with_genres=16&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=200"
        linkPrefix="/tv"
        mediaType="tv"
        hideSeeAll={true}
      />

      {/* Discover: Korean Dramas */}
      <MediaCarousel
        title="Korean Dramas"
        apiEndpoint="/api/getDiscover?type=tv&with_original_language=ko&sort_by=popularity.desc&vote_count.gte=100"
        linkPrefix="/tv"
        mediaType="tv"
        hideSeeAll={true}
      />

      {/* Discover: Sci-Fi & Fantasy Series */}
      <MediaCarousel
        title="Sci-Fi & Fantasy Series"
        apiEndpoint="/api/getDiscover?type=tv&with_genres=10765&sort_by=vote_average.desc&vote_count.gte=500"
        linkPrefix="/tv"
        mediaType="tv"
        hideSeeAll={true}
      />

      {/* Discover: Netflix Originals — network 213 */}
      <MediaCarousel
        title="Netflix Originals"
        apiEndpoint="/api/getDiscover?type=tv&with_networks=213&sort_by=popularity.desc"
        linkPrefix="/tv"
        mediaType="tv"
        hideSeeAll={true}
      />

      <MediaCarousel
        title="Top Rated TV Series"
        apiEndpoint="/api/getTVList?list=top_rated&page=1"
        linkPrefix="/tv"
        mediaType="tv"
        seeAllLink="/tv"
      />

      {/* Discover: Crime & Heist (movies) */}
      <MediaCarousel
        title="Crime & Heist"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=80,53&sort_by=vote_average.desc&vote_count.gte=1500"
        linkPrefix="/movie"
        mediaType="movie"
        hideSeeAll={true}
      />

      {/* Discover: Animated Movies */}
      <MediaCarousel
        title="Animated Movies"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=16&sort_by=vote_average.desc&vote_count.gte=1000"
        linkPrefix="/movie"
        mediaType="movie"
        hideSeeAll={true}
      />

      {/* Discover: Romantic Favourites */}
      <MediaCarousel
        title="Romantic Favourites"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=10749,18&sort_by=vote_average.desc&vote_count.gte=500"
        linkPrefix="/movie"
        mediaType="movie"
        hideSeeAll={true}
      />

      {/* Discover: Mystery & Suspense (TV) */}
      <MediaCarousel
        title="Mystery & Suspense"
        apiEndpoint="/api/getDiscover?type=tv&with_genres=9648,18&sort_by=vote_average.desc&vote_count.gte=300"
        linkPrefix="/tv"
        mediaType="tv"
        hideSeeAll={true}
      />
    </>
  );
}
