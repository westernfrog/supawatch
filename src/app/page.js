import MediaCarousel from "./components/MediaCarousel";
import Overview from "./components/Overview";

export default function Home() {
  return (
    <>
      <Overview />

      <MediaCarousel
        title="Now Playing"
        apiEndpoint="/api/getMovieList?list=now_playing&page=1"
        linkPrefix="/movie"
        mediaType="movie"
      />

      <MediaCarousel
        title="Popular Movies"
        apiEndpoint="/api/getMovieList?list=popular&page=1"
        linkPrefix="/movie"
        mediaType="movie"
        seeAllLink="/popular"
      />

      <MediaCarousel
        title="Critically Acclaimed Thrillers"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=53,9648&sort_by=vote_average.desc&vote_count.gte=2000"
        linkPrefix="/movie"
        mediaType="movie"
      />

      <MediaCarousel
        title="Award-Winning Dramas"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=18&sort_by=vote_average.desc&vote_count.gte=3000"
        linkPrefix="/movie"
        mediaType="movie"
      />

      <MediaCarousel
        title="Upcoming Movies"
        apiEndpoint="/api/getMovieList?list=upcoming&page=1"
        linkPrefix="/movie"
        mediaType="movie"
      />

      <MediaCarousel
        title="Sci-Fi & Space Adventures"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=878,12&sort_by=popularity.desc&vote_count.gte=500"
        linkPrefix="/movie"
        mediaType="movie"
      />

      <MediaCarousel
        title="Action Blockbusters"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=28,12&sort_by=popularity.desc&vote_count.gte=1000"
        linkPrefix="/movie"
        mediaType="movie"
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
      />

      <MediaCarousel
        title="Binge-Worthy Crime Dramas"
        apiEndpoint="/api/getDiscover?type=tv&with_genres=80,18&sort_by=vote_average.desc&vote_count.gte=500"
        linkPrefix="/tv"
        mediaType="tv"
      />

      <MediaCarousel
        title="Anime"
        apiEndpoint="/api/getDiscover?type=tv&with_genres=16&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=200"
        linkPrefix="/tv"
        mediaType="tv"
      />

      <MediaCarousel
        title="Korean Dramas"
        apiEndpoint="/api/getDiscover?type=tv&with_original_language=ko&sort_by=popularity.desc&vote_count.gte=100"
        linkPrefix="/tv"
        mediaType="tv"
      />

      <MediaCarousel
        title="Sci-Fi & Fantasy Series"
        apiEndpoint="/api/getDiscover?type=tv&with_genres=10765&sort_by=vote_average.desc&vote_count.gte=500"
        linkPrefix="/tv"
        mediaType="tv"
      />

      <MediaCarousel
        title="Netflix Originals"
        apiEndpoint="/api/getDiscover?type=tv&with_networks=213&sort_by=popularity.desc"
        linkPrefix="/tv"
        mediaType="tv"
      />

      <MediaCarousel
        title="Top Rated TV Series"
        apiEndpoint="/api/getTVList?list=top_rated&page=1"
        linkPrefix="/tv"
        mediaType="tv"
        seeAllLink="/tv"
      />

      <MediaCarousel
        title="Crime & Heist"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=80,53&sort_by=vote_average.desc&vote_count.gte=1500"
        linkPrefix="/movie"
        mediaType="movie"
      />

      <MediaCarousel
        title="Animated Movies"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=16&sort_by=vote_average.desc&vote_count.gte=1000"
        linkPrefix="/movie"
        mediaType="movie"
      />

      <MediaCarousel
        title="Romantic Favourites"
        apiEndpoint="/api/getDiscover?type=movie&with_genres=10749,18&sort_by=vote_average.desc&vote_count.gte=500"
        linkPrefix="/movie"
        mediaType="movie"
      />

      <MediaCarousel
        title="Mystery & Suspense"
        apiEndpoint="/api/getDiscover?type=tv&with_genres=9648,18&sort_by=vote_average.desc&vote_count.gte=300"
        linkPrefix="/tv"
        mediaType="tv"
      />
    </>
  );
}
