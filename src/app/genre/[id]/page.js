"use client";

import { useParams } from "next/navigation";
import MediaGrid from "@/app/components/MediaGrid";

export default function GenreId() {
  const { id } = useParams();

  const genresById = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Science Fiction",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
  };

  const genreName = genresById[id] || "Movies";

  return (
    <MediaGrid
      title={`${genreName} Movies`}
      subtitle={`Explore the best ${genreName.toLowerCase()} films`}
      apiEndpoint={`/api/getMovieDiscover?genre=${id}`}
      linkPrefix="/movie"
      emptyMessage="No more movies in this genre"
      heroImage="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    />
  );
}
