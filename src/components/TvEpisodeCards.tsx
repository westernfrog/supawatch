"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import BlurImage from "@/components/BlurImage";
import type { Season, Episode } from "./TvSeasonsBrowser";


interface Props {
  tvId: number;
  seasons: Season[];
  onWatch?: (season: number, episode: number) => void;
}

export default function TvEpisodeCards({ tvId, seasons, onWatch }: Props) {
  const [selectedSeason, setSelectedSeason] = useState<number>(
    seasons[0]?.season_number ?? 1,
  );
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tvId) return;

    let ignore = false;
    async function fetchEpisodes() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/getTvSeasonDetails?tvId=${tvId}&seasonNumber=${selectedSeason}`,
        );
        const data = await res.json();
        if (!ignore && data.episodes) {
          setEpisodes(data.episodes);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchEpisodes();

    return () => {
      ignore = true;
    };
  }, [tvId, selectedSeason]);

  if (seasons.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {/* Header & Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col justify-center gap-0.5">
            <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
              Episodes Guide
            </h2>
          </div>
        </div>

        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(Number(e.target.value))}
          className="cursor-pointer appearance-none rounded-md border border-white/10 bg-neutral-900/50 px-4 py-2 pr-8 font-space text-[12px] uppercase tracking-widest text-white/80 outline-none transition-colors hover:bg-white/[0.03] focus:border-white/30"
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff80%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.5rem center",
            backgroundSize: "1rem",
          }}
        >
          {seasons.map((s) => (
            <option
              key={s.id}
              value={s.season_number}
              className="bg-neutral-900 text-white"
            >
              S{s.season_number} — {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Cards Scroll Container */}
      <div className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto pb-4 scrollbar-hide">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex w-[400px] shrink-0 snap-start flex-col gap-4 sm:w-[500px] md:w-[580px] lg:w-[660px]"
              >
              <div className="aspect-video w-full animate-pulse rounded-md bg-white/[0.03]" />
              <div className="flex flex-col gap-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.03]" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.03]" />
                <div className="h-4 w-full animate-pulse rounded bg-white/[0.03]" />
              </div>
            </div>
          ))
        ) : episodes.length > 0 ? (
          episodes.map((ep) => (
            <div
              key={`card-${ep.id}`}
              className="group flex w-[400px] shrink-0 snap-start flex-col gap-4 sm:w-[500px] md:w-[580px] lg:w-[660px]"
            >
              <div
                className="relative aspect-[16/9] w-full overflow-hidden border border-white/10 bg-neutral-900 cursor-pointer"
                onClick={() => onWatch?.(selectedSeason, ep.episode_number)}
              >
                {ep.still_path ? (
                  <BlurImage
                    src={`https://image.tmdb.org/t/p/w780${ep.still_path}`}
                    alt={ep.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-manrope text-[11px] uppercase tracking-widest text-white/20">
                    No Image
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="p-4 font-manrope text-[13px] font-bold uppercase tracking-widest text-white transition-transform duration-300 group-hover:translate-x-1">
                    Play
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-space text-[13px] font-bold tracking-[0.2em] text-white/50">
                    E{ep.episode_number}
                  </span>
                  {ep.runtime ? (
                    <>
                      <div className="h-1 w-1 rounded-full bg-white/20" />
                      <span className="font-manrope text-[14px] font-medium text-white/50">
                        {ep.runtime} min
                      </span>
                    </>
                  ) : null}
                </div>
                <h4 className="font-manrope text-[18px] font-medium text-white/90 line-clamp-1 transition-colors group-hover:text-white">
                  {ep.name}
                </h4>
                <p className="mt-1 font-manrope text-[15px] font-light leading-[1.6] text-white/40 line-clamp-3">
                  {ep.overview || "No description available."}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex w-full items-center justify-center py-12 font-manrope text-[13px] text-white/40">
            No episodes found for this season.
          </div>
        )}
      </div>
    </div>
  );
}
