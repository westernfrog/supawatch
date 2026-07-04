"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import Link from "next/link";
import TvWatchModal from "./TvWatchModal";

interface Season {
  season_number: number;
  episode_count: number;
  name: string;
}

interface CastMember {
  id: number;
  name: string;
  profile_path: string | null;
}

interface Props {
  showId: number;
  showName: string;
  backdropPath: string | null;
  logo: string | null;
  seasons: Season[];
  rating: number;
  year: string | null;
  cast: CastMember[];
}

export default function TvHeroActions({
  showId,
  showName,
  backdropPath,
  logo,
  seasons,
  rating,
  year,
  cast,
}: Props) {
  const [showWatch, setShowWatch] = useState(false);

  return (
    <>
      {/* ─── Cast row ─── */}
      {cast.length > 0 && (
        <div className="flex items-center gap-5 pb-5">
          <span className="shrink-0 font-manrope text-[9px] uppercase tracking-[0.22em] text-neutral-600">
            With
          </span>
          <div className="h-3 w-px bg-white/[0.1]" />
          {cast.map(c => (
            <Link key={c.id} href={`/person/${c.id}`} className="group flex items-center gap-2.5">
              <div className="h-[32px] w-[32px] shrink-0 overflow-hidden rounded-full bg-neutral-800 ring-1 ring-white/[0.12] transition-opacity duration-150 group-hover:opacity-75">
                {c.profile_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w45${c.profile_path}`}
                    alt={c.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-manrope text-[9px] text-neutral-600">
                    {c.name[0]}
                  </div>
                )}
              </div>
              <div className="font-manrope leading-[1.25]">
                <div className="text-[12px] font-semibold text-neutral-100 transition-colors group-hover:text-white">
                  {c.name.split(" ")[0]}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {c.name.split(" ").slice(1).join(" ")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ─── Action bar ─── */}
      <div className="flex items-center gap-5 pb-10 pt-1">
        {/* Circular play */}
        <button onClick={() => setShowWatch(true)} className="group flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_24px_rgba(0,0,0,0.7)] transition-transform duration-200 group-hover:scale-105">
            <Play className="ml-0.5 h-[18px] w-[18px] fill-black text-black" />
          </div>
          <span className="font-manrope text-[14px] font-semibold text-white">Watch Now</span>
        </button>

        <div className="h-4 w-px bg-white/[0.12]" />

        {/* Seasons count */}
        {seasons.length > 0 && (
          <span className="font-manrope text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            {seasons.filter(s => s.season_number > 0).length} Season{seasons.filter(s => s.season_number > 0).length !== 1 ? "s" : ""}
          </span>
        )}

        <div className="flex-1" />
      </div>

      {/* Watch modal */}
      {showWatch && (
        <TvWatchModal
          showId={showId}
          showName={showName}
          backdropPath={backdropPath}
          logo={logo}
          seasons={seasons}
          rating={rating}
          year={year}
          onClose={() => setShowWatch(false)}
        />
      )}
    </>
  );
}
