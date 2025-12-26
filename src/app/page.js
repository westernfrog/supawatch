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
        hideSeeAll={true}
      />
      <MediaCarousel
        title="Popular Movies"
        apiEndpoint="/api/getMovieList?list=popular&page=1"
        linkPrefix="/movie"
        mediaType="movie"
        seeAllLink="/popular"
      />
      <MediaCarousel
        title="Upcoming Movies"
        apiEndpoint="/api/getMovieList?list=upcoming&page=1"
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
      <MediaCarousel
        title="Top Rated TV Series"
        apiEndpoint="/api/getTVList?list=top_rated&page=1"
        linkPrefix="/tv"
        mediaType="tv"
        seeAllLink="/tv"
      />
    </>
  );
}
