"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import MovieDetailsModal from "@/components/MovieDetailsModal";
import TvDetailsModal from "@/components/TvDetailsModal";
import BlurImage from "@/components/BlurImage";
import { fetchJson } from "@/lib/client-api";
import { useInView } from "@/lib/useInView";

interface GridItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genre_ids: number[];
  vote_average: number;
  release_date: string;
  first_air_date: string;
  media_type: "movie" | "tv";
}

interface Props {
  title: string;
  subtitle?: string;
  fetchUrl: string;
  limit?: number;
  mediaType?: "movie" | "tv";
  /* Hide these ids — used by personalized rows to skip titles the user
     has already interacted with. */
  excludeIds?: number[];
}

export default function MediaGrid({ title, subtitle, fetchUrl, limit = 12, mediaType, excludeIds }: Props) {
  const [items, setItems] = useState<GridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GridItem | null>(null);
  /* Defer the fetch until the section approaches the viewport — with dozens
     of sections per page this keeps the initial load down to what's visible. */
  const { ref, inView } = useInView();
  const excludeKey = (excludeIds ?? []).join(",");

  useEffect(() => {
    if (!inView) return;
    const exclude = new Set(excludeKey ? excludeKey.split(",").map(Number) : []);
    fetchJson(fetchUrl)
      .then((d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = d.results ?? d.data?.results ?? [];
        setItems(
          raw
            .filter((m) => m.poster_path && !exclude.has(m.id))
            .slice(0, limit)
            .map((m) => ({
              id: m.id,
              title: m.title ?? m.name ?? "",
              poster_path: m.poster_path,
              backdrop_path: m.backdrop_path ?? null,
              overview: m.overview ?? "",
              genre_ids: m.genre_ids ?? [],
              vote_average: m.vote_average ?? 0,
              release_date: m.release_date ?? "",
              first_air_date: m.first_air_date ?? "",
              media_type: (m.media_type as "movie" | "tv") ?? mediaType ?? (m.title ? "movie" : "tv"),
            })),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchUrl, limit, mediaType, inView, excludeKey]);

  /* Nothing came back (thin catalog, failed fetch) — drop the whole
     section rather than strand an empty header. */
  if (!loading && items.length === 0) return null;

  return (
    <>
      <div ref={ref} className="snap-section pt-16 pb-12 lg:pt-24 lg:pb-16">
        {/* ── Header ── */}
        <div className="mb-6 px-5 md:px-8 lg:px-12">
          <div className="mx-auto flex max-w-[1400px] items-center gap-4">
            <div className="h-9 w-1 shrink-0 bg-[#e50914]" />
            <div className="flex flex-col justify-center gap-0.5">
              {subtitle && (
                <span className="font-space text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">
                  {subtitle}
                </span>
              )}
              <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
                {title}
              </h2>
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="px-5 md:px-8 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid grid-cols-3 sm:grid-cols-6">
              {loading
                ? Array.from({ length: limit }).map((_, i) => <SkeletonCard key={i} />)
                : items.map((item) => (
                    <Card
                      key={item.id}
                      item={item}
                      onClick={() => setSelected(item)}
                    />
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {selected?.media_type === "movie" && selected.backdrop_path && (
        <MovieDetailsModal
          movie={{
            id: selected.id,
            title: selected.title,
            overview: selected.overview,
            backdrop_path: selected.backdrop_path,
            genre_ids: selected.genre_ids,
            vote_average: selected.vote_average,
            release_date: selected.release_date,
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {selected?.media_type === "tv" && selected.backdrop_path && (
        <TvDetailsModal
          show={{
            id: selected.id,
            name: selected.title,
            overview: selected.overview,
            backdrop_path: selected.backdrop_path,
            genre_ids: selected.genre_ids,
            vote_average: selected.vote_average,
            first_air_date: selected.first_air_date,
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function Card({ item, onClick }: { item: GridItem; onClick: () => void }) {
  const canOpenModal = Boolean(item.backdrop_path);

  return (
    <div
      className={cn("group relative aspect-[2/3] w-full overflow-hidden bg-neutral-900", canOpenModal && "cursor-pointer")}
      onClick={canOpenModal ? onClick : undefined}
    >
      {item.poster_path ? (
        <BlurImage
          src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-manrope text-[11px] text-neutral-600">
          {item.title[0]}
        </div>
      )}
      <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}

function SkeletonCard() {
  return <div className="aspect-[2/3] w-full animate-pulse bg-white/[0.04]" />;
}
