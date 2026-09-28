"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Film } from "lucide-react";
import AudienceRating from "@/components/AudienceRating";
import BlurImage from "@/components/BlurImage";
import SaveTitleButton from "./SaveTitleButton";
import { type DiscoveryTitle } from "@/lib/discovery";
import { GENRE_NAMES } from "@/lib/genres";
import { cn } from "@/lib/utils";

export type MediaCardItem = Pick<DiscoveryTitle, "id" | "media_type" | "title" | "poster_path"> & Partial<DiscoveryTitle>;

type Props = {
  item: MediaCardItem;
  rank?: number;
  savedList?: boolean;
  story?: boolean;
  landscape?: boolean;
  note?: string;
  onOpen?: () => void;
  onNavigate?: () => void;
  /** Text shown in place of the title (e.g. mid-animation); the real title stays the accessible name. */
  displayTitle?: string;
  /** An extra action placed before "My List", such as Watch now. */
  primaryAction?: ReactNode;
};

/** The same artwork, metadata and actions on every browsing surface. */
export default function TitleCard({ item: input, rank, savedList, story, landscape, note, onOpen, onNavigate, displayTitle, primaryAction }: Props) {
  const item: DiscoveryTitle = { backdrop_path: null, overview: "", genre_ids: [], vote_average: 0, vote_count: 0, original_language: "", date: "", ...input };
  const href = `/${item.media_type === "movie" ? "films" : "series"}/${item.id}`;
  const genre = item.genre_ids.map(id => GENRE_NAMES[String(id)]).filter(Boolean).slice(0, 2).join(" / ");
  const artwork = landscape ? item.backdrop_path || item.poster_path : item.poster_path;
  const art = <>
    {artwork ? <BlurImage src={`https://image.tmdb.org/t/p/${landscape ? "w780" : "w342"}${artwork}`} alt="" width={landscape ? 780 : 342} height={landscape ? 439 : 513} /> : <span className="media-card-fallback"><Film size={28} strokeWidth={1} /><span>{item.title}</span></span>}
    <span className="media-card-explore" aria-hidden="true"><ArrowUpRight size={20} /></span>
  </>;
  return <article className={cn("media-card", savedList && "media-card--saved", story && "media-card--story", landscape && "media-card--landscape")}>
    <div className="media-card-visual">
      {onOpen ? <button type="button" className="media-card-art" onClick={onOpen} aria-label={`Explore ${item.title}`}>{art}</button> : <Link prefetch={false} href={href} onNavigate={onNavigate} transitionTypes={["nav-forward"]} className="media-card-art" aria-label={`Explore ${item.title}`}>{art}</Link>}
      {rank != null && <span className="media-card-rank" aria-label={`Rank ${rank}`}>{String(rank).padStart(2, "0")}</span>}
    </div>
    <div className="media-card-copy">
      <div className="media-card-meta"><span>{item.media_type === "tv" ? "Series" : "Film"}{item.date ? ` / ${item.date.slice(0, 4)}` : ""}</span><AudienceRating value={item.vote_average} /></div>
      <div className="media-card-heading"><h3>{onOpen ? <button type="button" onClick={onOpen} aria-label={displayTitle ? item.title : undefined}>{displayTitle ?? item.title}</button> : <Link prefetch={false} href={href} onNavigate={onNavigate} transitionTypes={["nav-forward"]} aria-label={displayTitle ? item.title : undefined}>{displayTitle ?? item.title}</Link>}</h3></div>
      {(note || genre) && <p className="media-card-note">{note || genre}</p>}
      {!savedList && <div className={cn("media-card-save", primaryAction && "media-card-save--with-action")}>{primaryAction}<SaveTitleButton item={item} /></div>}
      {story && item.overview && <p className="media-card-synopsis">{item.overview}</p>}
    </div>
    {savedList && <div className="media-card-saved-action"><SaveTitleButton item={item} remove /></div>}
  </article>;
}
