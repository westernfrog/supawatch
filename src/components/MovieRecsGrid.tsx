"use client";

import { useState } from "react";
import MovieDetailsModal from "./MovieDetailsModal";
import BlurImage from "@/components/BlurImage";
import { fetchJson } from "@/lib/client-api";

interface Rec {
  id: number;
  title: string;
  poster_path: string | null;
}

interface Movie {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  genre_ids: number[];
  vote_average: number;
  release_date: string;
}

export default function MovieRecsGrid({ recs }: { recs: Rec[] }) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleClick = async (id: number) => {
    setLoadingId(id);
    try {
      const json = await fetchJson(`/api/getMovieDetailsEnhanced?id=${id}`);
      const d = json.data;
      setSelectedMovie({
        id: d.id,
        title: d.title,
        overview: d.overview ?? "",
        backdrop_path: d.backdrop_path ?? "",
        genre_ids: (d.genres ?? []).map((g: { id: number }) => g.id),
        vote_average: d.vote_average ?? 0,
        release_date: d.release_date ?? "",
      });
    } catch {
      /* silently ignore */
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-6">
        {recs.map((r) => (
          <button
            key={r.id}
            onClick={() => handleClick(r.id)}
            disabled={loadingId === r.id}
            className="group relative aspect-[2/3] overflow-hidden bg-neutral-900"
          >
            {r.poster_path ? (
              <BlurImage
                src={`https://image.tmdb.org/t/p/w342${r.poster_path}`}
                alt={r.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-manrope text-[11px] text-neutral-600">
                {r.title[0]}
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {loadingId === r.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </>
  );
}
