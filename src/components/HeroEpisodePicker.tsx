"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BlurImage from "@/components/BlurImage";
import { fetchJson } from "@/lib/client-api";
import type { Season, Episode } from "@/components/TvSeasonsBrowser";

type Pick = { season: number; episode: number };
type Props = { tvId: number; seasons: Season[]; value: Pick; onChange: (pick: Pick) => void };
type SeasonResult = { episodes: Episode[]; error: boolean };

const pad = (value: number) => String(value).padStart(2, "0");

function Still({ path, episode, size }: { path: string | null | undefined; episode: number; size: "sm" | "md" }) {
  return <span className={`hero-episode-still hero-episode-still--${size}`}>{path ? <BlurImage src={`https://image.tmdb.org/t/p/w300${path}`} alt="" width={300} height={169} /> : <span aria-hidden="true">E{pad(episode)}</span>}</span>;
}

/** Season + episode chooser for the series hero, with episode stills. */
export default function HeroEpisodePicker({ tvId, seasons, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [browsing, setBrowsing] = useState(value.season);
  const [results, setResults] = useState<Record<number, SeasonResult>>({});
  const [attempt, setAttempt] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const seasonStripRef = useRef<HTMLDivElement>(null);

  // Load the picked season up front (for the trigger still) and whichever season is being browsed.
  useEffect(() => {
    let cancelled = false;
    for (const number of new Set([value.season, browsing])) {
      if (results[number] && !results[number].error) continue;
      fetchJson<{ episodes?: Episode[] }>(`/api/getTvSeasonDetails?id=${tvId}&season_number=${number}`)
        .then(data => { if (!cancelled) setResults(previous => ({ ...previous, [number]: { episodes: data.episodes ?? [], error: false } })); })
        .catch(() => { if (!cancelled) setResults(previous => ({ ...previous, [number]: { episodes: [], error: true } })); });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvId, value.season, browsing, attempt]);

  // Bring the chosen season chip and episode row into view when the panel opens or its data arrives.
  const browsingLoaded = Boolean(results[browsing]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      seasonStripRef.current?.querySelector<HTMLElement>("[aria-pressed='true']")?.scrollIntoView({ block: "nearest", inline: "center" });
      listRef.current?.querySelector<HTMLElement>("[aria-current='true']")?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, browsing, browsingLoaded]);

  const current = results[value.season]?.episodes.find(episode => episode.episode_number === value.episode);
  const browsed = results[browsing];
  const browsedSeason = seasons.find(season => season.season_number === browsing);

  return <Popover open={open} onOpenChange={next => { setOpen(next); if (next) setBrowsing(value.season); }}>
    <PopoverTrigger asChild>
      <button type="button" className="hero-episode-trigger" aria-label={`Choose episode. Current: season ${value.season}, episode ${value.episode}${current ? `, ${current.name}` : ""}`}>
        <Still path={current?.still_path} episode={value.episode} size="sm" />
        <span className="hero-episode-trigger-text"><span>Season {value.season} / Episode {value.episode}</span><strong>{current?.name ?? `Episode ${value.episode}`}</strong></span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" side="top" sideOffset={10} collisionPadding={16} className="hero-episode-panel">
      <div ref={seasonStripRef} className="hero-season-strip" role="group" aria-label="Seasons">
        {seasons.map(season => <button key={season.id} type="button" aria-pressed={season.season_number === browsing} onClick={() => setBrowsing(season.season_number)}>S{season.season_number}</button>)}
      </div>
      <div className="hero-episode-panel-heading"><span>Season {browsing}</span><span>{browsedSeason?.episode_count ?? 0} episodes{browsedSeason?.air_date ? ` / ${browsedSeason.air_date.slice(0, 4)}` : ""}</span></div>
      <div ref={listRef} className="hero-episode-list" role="list" aria-busy={!browsed}>
        {browsed?.error ? <div className="hero-episode-empty"><p>This season couldn’t load.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
          : !browsed ? Array.from({ length: Math.min(browsedSeason?.episode_count ?? 4, 4) }, (_, index) => <div key={index} className="hero-episode-row hero-episode-row--loading" />)
          : !browsed.episodes.length ? <p className="hero-episode-empty">No episodes listed yet.</p>
          : browsed.episodes.map(episode => {
            const active = browsing === value.season && episode.episode_number === value.episode;
            return <div role="listitem" key={episode.id}><button type="button" className="hero-episode-row" aria-current={active} onClick={() => { onChange({ season: browsing, episode: episode.episode_number }); setOpen(false); }}>
              <Still path={episode.still_path} episode={episode.episode_number} size="md" />
              <span className="hero-episode-row-text"><span>E{pad(episode.episode_number)}{episode.runtime ? ` / ${episode.runtime} min` : ""}</span><strong>{episode.name}</strong></span>
            </button></div>;
          })}
      </div>
    </PopoverContent>
  </Popover>;
}
