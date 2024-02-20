import MovieList from "./components/MovieList";
import Overview from "./components/Overview";
import TVList from "./components/TVList";

export default function Home(params) {
  return (
    <>
      <Overview />
      <MovieList list="now_playing" title="Now Playing" />
      <MovieList list="popular" title="Popular Movies" />
      <MovieList list="upcoming" title="Upcoming Movies" />
      <MovieList list="top-rated" title="Top Rated Movies" />
      <TVList list="popular" title="Popular TV series" />
      <TVList list="top_rated" title="Top Rated TV series" />
    </>
  );
}
