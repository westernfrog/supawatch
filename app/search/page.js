import MovieList from "../components/MovieList";

export default function Search(params) {
  return (
    <>
      <section className="my-24">
        <MovieList list="now_playing" title="Now Playing" />
        <MovieList list="top_rated" title="Top Rated Movies" />
      </section>
    </>
  );
}
