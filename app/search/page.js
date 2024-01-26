import Footer from "../components/Footer";
import List from "../components/List";

export default function Search(params) {
  return (
    <>
      <section className="my-24">
        <List list="now_playing" title="Now Playing" />
        <List list="top_rated" title="Top Rated Movies" />
      </section>
    </>
  );
}
