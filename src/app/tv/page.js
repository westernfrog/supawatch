"use client";

import MediaGrid from "../components/MediaGrid";

export default function TV() {
  return (
    <MediaGrid
      title="TV Series"
      subtitle="Top-rated series and shows to binge-watch"
      apiEndpoint="/api/getTVList?list=top_rated"
      linkPrefix="/tv"
      emptyMessage="No more TV shows"
      heroImage="https://images.unsplash.com/photo-1559587393-cded28a4f78d?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    />
  );
}
