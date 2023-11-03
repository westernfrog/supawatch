import Overview from "./components/Overview";
import Trending from "./components/Trending";
import Upcoming from "./components/Upcoming";

export default function Home(params) {
  return (
    <>
      <Overview />
      <Trending />
      <Upcoming />
    </>
  );
}
