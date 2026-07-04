"use client";

import { Fragment, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  air_date: string | null;
}

export interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

function fmtShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  tvId: number;
  seasons: Season[];
  variant?: "modal" | "page";
  onWatch?: (season: number, episode: number) => void;
}

function getRatingClasses(r: number) {
  if (r >= 9.0)
    return "bg-gradient-to-b from-[#8b5cf6] to-[#4c1d95] border-[#a78bfa]/40 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]";
  if (r >= 8.0)
    return "bg-gradient-to-b from-[#059669]/90 to-[#064e3b]/90 border-[#10b981]/30 text-white/95";
  if (r >= 7.0)
    return "bg-gradient-to-b from-[#4ade80]/90 to-[#166534]/90 border-[#4ade80]/30 text-white/95";
  if (r >= 6.0)
    return "bg-gradient-to-b from-[#d97706]/90 to-[#78350f]/90 border-[#f59e0b]/30 text-white/95";
  if (r >= 4.0)
    return "bg-gradient-to-b from-[#dc2626]/90 to-[#7f1d1d]/90 border-[#ef4444]/30 text-white/95";
  if (r > 0)
    return "bg-gradient-to-b from-[#7f1d1d]/90 to-[#450a0a]/90 border-[#b91c1c]/30 text-white/80";
  return "bg-gradient-to-b from-white/[0.06] to-white/[0.02] border-white/[0.06] text-white/30";
}

function getRatingTextColor(r: number) {
  if (r >= 9.0) return "text-[#a78bfa]";
  if (r >= 8.0) return "text-[#10b981]";
  if (r >= 7.0) return "text-[#4ade80]";
  if (r >= 6.0) return "text-[#f59e0b]";
  if (r >= 4.0) return "text-[#f87171]";
  if (r > 0) return "text-[#ef4444]";
  return "text-neutral-500";
}

export default function TvSeasonsBrowser({
  tvId,
  seasons,
  variant = "modal",
  onWatch,
}: Props) {
  const isPage = variant === "page";
  const [episodesCache, setEpisodesCache] = useState<Record<number, Episode[]>>(
    {},
  );

  /* Fetch ALL seasons in parallel on mount */
  useEffect(() => {
    const missing = seasons.filter((s) => s.season_number !== 0 && !(s.season_number in episodesCache));
    if (missing.length === 0) return;
    Promise.all(
      missing.map((s) =>
        fetch(
          `/api/getTvSeasonDetails?id=${tvId}&season_number=${s.season_number}`,
        )
          .then((r) => r.json())
          .then((res) => [s.season_number, res.episodes ?? []] as const)
          .catch(() => [s.season_number, []] as const),
      ),
    ).then((results) =>
      setEpisodesCache((prev) => {
        const next = { ...prev };
        results.forEach(([n, eps]) => {
          next[n] = eps;
        });
        return next;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvId, seasons]);

  const filteredSeasons = seasons.filter((s) => s.season_number !== 0);

  if (filteredSeasons.length === 0) return null;

  return (
    <div>
      {/* ── Header ── */}
      {!isPage && (
        <div className="mb-5 flex items-baseline gap-2.5">
          <p className="font-manrope text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            Episodes
          </p>
          <span className="font-space text-[12px] text-neutral-600">
            {filteredSeasons.reduce((a, s) => a + s.episode_count, 0)} total
          </span>
        </div>
      )}

      {/* ── Seasons List ── */}
      {isPage ? (
        <div className="flex flex-col gap-12">
          {filteredSeasons.map((s) => {
            const eps = episodesCache[s.season_number];
            const loading = eps === undefined;
            
            // Calculate average rating of episodes with >0 rating
            const validRatings = eps?.filter((ep) => ep.vote_average > 0) ?? [];
            const avgRating = validRatings.length > 0
              ? validRatings.reduce((acc, ep) => acc + ep.vote_average, 0) / validRatings.length
              : null;

            return (
              <div key={s.id} className="flex flex-col gap-5">
                {/* Season Header */}
                <div className="flex items-end gap-5">
                  {s.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w154${s.poster_path}`}
                      alt={s.name}
                      loading="lazy"
                      decoding="async"
                      className="h-[100px] w-[66px] rounded-md object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-[100px] w-[66px] items-center justify-center rounded-md border border-white/10 bg-white/[0.02]">
                      <span className="font-space text-[14px] font-bold text-white/30">
                        S{String(s.season_number).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex flex-col pb-1">
                    <h3 className="font-manrope text-[18px] font-semibold tracking-tight text-white/90">
                      {s.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 font-space text-[12px] text-white/50">
                      {s.air_date && <span>{s.air_date.slice(0, 4)}</span>}
                      {s.air_date && <div className="h-1 w-1 rounded-full bg-white/20" />}
                      <span>{s.episode_count} Episodes</span>
                      {avgRating && (
                        <>
                          <div className="h-1 w-1 rounded-full bg-white/20" />
                          <span className={getRatingTextColor(avgRating)}>
                            {avgRating.toFixed(1)} Avg
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Episode Heatmap */}
                <div className="flex flex-wrap gap-2">
                  {loading
                    ? Array.from({ length: Math.min(s.episode_count, 10) }).map(
                        (_, i) => (
                          <div
                            key={i}
                            className="h-12 w-12 animate-pulse rounded-md border border-white/[0.05] bg-white/[0.03]"
                          />
                        ),
                      )
                    : eps.map((ep) => (
                        <div
                          key={ep.id}
                          title={`E${ep.episode_number}: ${ep.name}`}
                          onClick={() =>
                            onWatch?.(s.season_number, ep.episode_number)
                          }
                          className={cn(
                            "group relative flex h-12 w-12 flex-col items-center justify-center gap-[2px] rounded-md border transition-all duration-300 hover:z-10 hover:scale-125",
                            onWatch ? "cursor-pointer" : "cursor-default",
                            getRatingClasses(ep.vote_average),
                          )}
                        >
                          <span className="font-space text-[14px] font-bold leading-none tracking-tighter drop-shadow-md">
                            {ep.vote_average > 0
                              ? ep.vote_average.toFixed(1)
                              : "—"}
                          </span>
                          <span className="font-manrope text-[9px] font-medium leading-none opacity-60">
                            E{ep.episode_number}
                          </span>
                        </div>
                      ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-[52px_1fr] items-start gap-x-5 gap-y-4">
          {filteredSeasons.map((s) => {
            const eps = episodesCache[s.season_number];
            const loading = eps === undefined;

            return (
              <Fragment key={s.id}>
                {/* Season label */}
                <div className="flex h-12 w-full items-center justify-between">
                  <span className="font-space text-[14px] tracking-widest text-white/30">
                    {s.season_number === 0 ? (
                      <span className="font-bold text-white/90">SP</span>
                    ) : (
                      <>
                        S
                        <span className="font-bold text-white/90">
                          {String(s.season_number).padStart(2, "0")}
                        </span>
                      </>
                    )}
                  </span>

                  {/* Decorative separator */}
                  <div className="flex h-8 w-[2px] shrink-0 items-center justify-center rounded-full bg-white/10">
                    <div className="h-1 w-1 rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  </div>
                </div>

                {/* Episode boxes */}
                <div className="flex flex-wrap gap-2">
                  {loading
                    ? Array.from({ length: Math.min(s.episode_count, 10) }).map(
                        (_, i) => (
                          <div
                            key={i}
                            className="h-12 w-12 animate-pulse rounded-md border border-white/[0.05] bg-white/[0.03]"
                          />
                        ),
                      )
                    : eps.map((ep) => (
                        <div
                          key={ep.id}
                          title={`E${ep.episode_number}: ${ep.name}`}
                          onClick={() =>
                            onWatch?.(s.season_number, ep.episode_number)
                          }
                          className={cn(
                            "group relative flex h-12 w-12 flex-col items-center justify-center gap-[2px] rounded-md border transition-all duration-300 hover:z-10 hover:scale-125",
                            onWatch ? "cursor-pointer" : "cursor-default",
                            getRatingClasses(ep.vote_average),
                          )}
                        >
                          <span className="font-space text-[14px] font-bold leading-none tracking-tighter drop-shadow-md">
                            {ep.vote_average > 0
                              ? ep.vote_average.toFixed(1)
                              : "—"}
                          </span>
                          <span className="font-manrope text-[9px] font-medium leading-none opacity-60">
                            E{ep.episode_number}
                          </span>
                        </div>
                      ))}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
