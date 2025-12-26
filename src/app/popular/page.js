"use client";

import MediaGrid from "../components/MediaGrid";

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
