"use client";

import MediaGrid from "../components/MediaGrid";

export default function TopRated() {
  return (
    <MediaGrid
      title="Top Rated Movies"
      subtitle="Critically acclaimed and highly rated films"
      apiEndpoint="/api/getMovieList?list=top_rated"
      linkPrefix="/movie"
      emptyMessage="No more movies"
      heroImage="https://images.unsplash.com/photo-1511875762315-c773eb98eec0?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    />
  );
}
