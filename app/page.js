import Overview from "./components/Overview";
import TopRated from "./components/TopRated";
import Trending from "./components/Trending";
import Upcoming from "./components/Upcoming";

export default function Home(params) {
  return (
    <>
      <Overview />
      <Trending />
      <Upcoming />
      <TopRated />
    </>
  );
}
