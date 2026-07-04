"use client";

import { useState } from "react";
import TvEpisodeCards from "./TvEpisodeCards";
import TvSeasonsBrowser, { type Season } from "./TvSeasonsBrowser";
import TvWatchModal from "./TvWatchModal";

interface Props {
  tvId: number;
  showId: number;
  showName: string;
  backdropPath: string | null;
  logo: string | null;
  seasons: Season[];
  rating: number;
  year: string | null;
}

export default function TvEpisodeWrapper({
  tvId,
  showId,
  showName,
  backdropPath,
  logo,
  seasons,
  rating,
  year,
}: Props) {
  const [watchTarget, setWatchTarget] = useState<{
    season: number;
    episode: number;
  } | null>(null);

  function openWatch(season: number, episode: number) {
    setWatchTarget({ season, episode });
  }

  return (
    <>
      {/* ── EPISODE CARDS ── */}
      <div className="px-8 pb-16 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          <TvEpisodeCards tvId={tvId} seasons={seasons} onWatch={openWatch} />
        </div>
      </div>

      {/* ── EPISODES HEATMAP ── */}
      <div className="px-8 pb-16 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex flex-col justify-center gap-0.5">
              <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
                Episodes Heatmap
              </h2>
            </div>
          </div>
          <TvSeasonsBrowser
            tvId={tvId}
            seasons={seasons}
            variant="page"
            onWatch={openWatch}
          />
        </div>
      </div>

      {watchTarget && (
        <TvWatchModal
          showId={showId}
          showName={showName}
          backdropPath={backdropPath}
          logo={logo}
          seasons={seasons}
          rating={rating}
          year={year}
          initialSeason={watchTarget.season}
          initialEpisode={watchTarget.episode}
          onClose={() => setWatchTarget(null)}
        />
      )}
    </>
  );
}
