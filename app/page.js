import List from "./components/List";
import Overview from "./components/Overview";
import TVList from "./components/TVList";
import TopRated from "./components/TopRated";

export default function Home(params) {
  return (
    <>
      <Overview />
      <List list="now_playing" title="Now Playing" />
      <List list="popular" title="Popular Movies" />
      <List list="upcoming" title="Upcoming Movies" />
      <TopRated />
      <TVList list="popular" title="Popular TV series" />
      <TVList list="top_rated" title="Top Rated TV series" />
    </>
  );
}
