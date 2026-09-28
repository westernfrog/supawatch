"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDown, Play, Clapperboard } from "lucide-react";
import AudienceRating from "@/components/AudienceRating";
import BlurImage from "@/components/BlurImage";
import SaveTitleButton from "@/components/discovery/SaveTitleButton";
import dynamic from "next/dynamic";
import { useWatchProviders } from "@/lib/useWatchProviders";
import HeroEpisodePicker from "@/components/HeroEpisodePicker";
import type { DiscoveryTitle } from "@/lib/discovery";
import type { Season } from "@/components/TvSeasonsBrowser";

const WatchModal = dynamic(() => import("@/components/WatchModal"));
const TvWatchModal = dynamic(() => import("@/components/TvWatchModal"));
const TrailerPlayer = dynamic(() => import("@/components/TrailerPlayer"));

export type DetailHeroProps = {
  id: number; type: "movie" | "tv"; title: string; poster: string | null; backdrop: string | null;
  logo: string | null; trailer: string | null; trailerKeys?: string[]; overview: string;
  year: string | null; duration: string | null; status: string | null; rating: number; votes: number;
  genres: { id: number; name: string }[]; creator: { name: string; id: number } | null;
  saveable: DiscoveryTitle | null; seasons?: Season[];
};

export default function TitleDetailHero({ id, type, title, poster, backdrop, logo, trailer, trailerKeys, overview, year, duration, status, rating, votes, genres, saveable, seasons = [] }: DetailHeroProps) {
  const watchTrigger = useRef<HTMLButtonElement>(null);
  const trailerTrigger = useRef<HTMLButtonElement>(null);
  function closeWatch() { setWatch(false); requestAnimationFrame(() => watchTrigger.current?.focus({ preventScroll: true })); }
  function closeTrailer() { setTrailerOpen(false); requestAnimationFrame(() => trailerTrigger.current?.focus({ preventScroll: true })); }
  const [watch, setWatch] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const { providers, providersLink } = useWatchProviders(id, type);
  const regularSeasons = seasons.filter(season => season.season_number > 0);
  const canWatch = type === "movie" || regularSeasons.length > 0;
  const artwork = backdrop || poster;
  const [pick, setPick] = useState({ season: regularSeasons[0]?.season_number ?? 1, episode: 1 });
  return <>
    <header className="cinematic-hero title-scene">
      {artwork && <div className="cinematic-art" aria-hidden="true"><BlurImage src={`https://image.tmdb.org/t/p/${backdrop ? "w1920" : "w780"}${artwork}`} alt="" width={1920} height={1080} lazy={false} /></div>}
      <div className="cinematic-scrim" />
      <div className="scene-content">
        <h1 className={logo ? "scene-title scene-title--logo" : "scene-title"}>{logo ? <><span className="sr-only">{title}</span><BlurImage src={`https://image.tmdb.org/t/p/w500${logo}`} alt="" width={500} height={200} lazy={false} /></> : title}</h1>
        <div className="scene-meta"><AudienceRating value={rating} prominent />{year && <span>{year}</span>}{duration && <span>{duration}</span>}{type === "tv" && <span>{regularSeasons.length} season{regularSeasons.length === 1 ? "" : "s"}</span>}<span className="scene-genres">{genres.slice(0, 3).map((genre, index) => <span key={genre.id}>{index > 0 && ", "}<Link prefetch={false} href={`/${type === "movie" ? "films" : "series"}?genre=${genre.id}`}>{genre.name}</Link></span>)}</span></div>
        {type === "tv" && regularSeasons.length > 0 && <div className="scene-episode-picker"><HeroEpisodePicker tvId={id} seasons={regularSeasons} value={pick} onChange={setPick} /></div>}
        <div className="scene-actions">{canWatch && <button ref={watchTrigger} className="scene-play" onClick={() => setWatch(true)}><span><Play size={19} fill="currentColor" /></span>{type === "tv" ? `Play S${pick.season} · E${pick.episode}` : "Watch now"}</button>}{trailer && <button ref={trailerTrigger} className="scene-trailer" onClick={() => setTrailerOpen(true)}><Clapperboard size={16} />Watch trailer</button>}{saveable && <SaveTitleButton item={saveable} />}</div>
      </div>
      <a href="#title-overview" className="scene-scroll"><span>Explore the story</span><ArrowDown size={18} /></a>
    </header>
    <section id="title-overview" className="scene-overview"><div><p className="eyebrow">The story</p><h2>{type === "movie" ? "Before the credits roll." : "One episode at a time."}</h2><div className="scene-overview-stats">{status && <span>{status}</span>}{votes > 0 && <span>{new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(votes)} audience ratings</span>}</div></div><div>{overview ? <p>{overview}</p> : <p>A synopsis isn’t available yet.</p>}{providers.length > 0 && providersLink && <div className="scene-providers"><span className="eyebrow">Available on</span>{providers.slice(0, 5).map(provider => <a key={provider.provider_id} href={providersLink} target="_blank" rel="noopener noreferrer" title={provider.provider_name}><BlurImage src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`} alt={provider.provider_name} width={32} height={32} /></a>)}<a href={providersLink} target="_blank" rel="noopener noreferrer" className="text-link">Check availability <ArrowUpRight size={14} /></a></div>}</div></section>
    {trailerOpen && trailer && <TrailerPlayer title={title} videoKeys={trailerKeys?.length ? trailerKeys : [trailer]} onClose={closeTrailer} />}
    {watch && type === "movie" && <WatchModal movie={{ id, title, backdrop_path: backdrop ?? "", vote_average: rating, release_date: year ? `${year}-01-01` : "" }} logo={logo} runtimeLabel={duration} genres={genres} onClose={closeWatch} />}
    {watch && type === "tv" && <TvWatchModal showId={id} showName={title} backdropPath={backdrop} logo={logo} seasons={regularSeasons} rating={rating} year={year} initialSeason={pick.season} initialEpisode={pick.episode} onClose={closeWatch} />}
  </>;
}
