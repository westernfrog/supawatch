import MediaGrid from "../components/MediaGrid";

export const metadata = {
  title: "Popular Movies",
  description:
    "Discover the most popular movies trending right now. Watch trailers and explore cast information on Supawatch.",
  openGraph: {
    title: "Popular Movies | Supawatch",
    description: "Discover the most popular movies trending right now.",
  },
};

export default function Popular() {
  return (
    <MediaGrid
      title="Popular Movies"
      subtitle="Trending now on streaming platforms"
      apiEndpoint="/api/getMovieList?list=popular"
      linkPrefix="/movie"
      emptyMessage="No more movies"
      heroImage="https://images.unsplash.com/photo-1724649399943-5f50ea36200a?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    />
  );
}
