import MediaGrid from "../components/MediaGrid";

export const metadata = {
  title: "Top Rated Movies",
  description:
    "Explore the highest rated movies of all time. Find critically acclaimed films with top ratings on Supawatch.",
  openGraph: {
    title: "Top Rated Movies | Supawatch",
    description: "Explore the highest rated movies of all time.",
  },
};

export default function TopRated() {
  return (
    <MediaGrid
      title="Top Rated Movies"
      subtitle="Critically acclaimed and highly rated films"
      apiEndpoint="/api/getMovieList?list=top_rated"
      linkPrefix="/movie"
      emptyMessage="No more movies"
      heroImage="https://images.unsplash.com/photo-1569035560433-6113350a78a6?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    />
  );
}
