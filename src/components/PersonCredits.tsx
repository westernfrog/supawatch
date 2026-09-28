"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import TitleCard from "@/components/discovery/TitleCard";
import BlurImage from "@/components/BlurImage";
import AudienceRating from "@/components/AudienceRating";
import { normalizeTitle, titleKey } from "@/lib/discovery";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Credit {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genre_ids: number[];
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  character?: string;
  job?: string;
  credit_id: string;
}

export default function PersonCredits({ knownFor, filmography }: { knownFor: Credit[]; filmography: Credit[] }) {
  const [filter, setFilter] = useState("all");
  const credits = filmography.filter(credit => filter === "all" || credit.media_type === filter);
  return <div className="person-work discovery-controls">
    {knownFor.length > 0 && <section className="person-known-for"><header className="detail-section-heading"><div><p className="eyebrow">A good place to start</p><h2>Selected work.</h2></div><span>{knownFor.length} titles</span></header><div className="poster-rail" tabIndex={0} role="region" aria-label="Selected work">{knownFor.map(credit => {
      const item = normalizeTitle({ ...credit });
      return item ? <TitleCard key={titleKey(item)} item={item} note={credit.character ? `As ${credit.character}` : credit.job} /> : null;
    })}</div></section>}
    <section id="filmography" className="person-filmography"><header className="detail-section-heading"><div><p className="eyebrow">The complete picture</p><h2>Filmography<span className="section-count">{credits.length}</span></h2></div><ToggleGroup type="single" value={filter} onValueChange={value => { if (value) setFilter(value); }} aria-label="Filter filmography"><ToggleGroupItem value="all">All work</ToggleGroupItem><ToggleGroupItem value="movie">Films</ToggleGroupItem><ToggleGroupItem value="tv">Series</ToggleGroupItem></ToggleGroup></header>
      <div className="filmography-table">{credits.map((credit, index) => <Link prefetch={false} className="filmography-row" href={`/${credit.media_type === "movie" ? "films" : "series"}/${credit.id}`} key={`${credit.credit_id || credit.id}-${credit.character || credit.job}-${index}`}>
        <span className="filmography-year">{(credit.release_date || credit.first_air_date || "").slice(0, 4) || "TBA"}</span>
        <div className="filmography-poster">{credit.poster_path && <BlurImage src={`https://image.tmdb.org/t/p/w92${credit.poster_path}`} alt="" width={46} height={69} />}</div>
        <div className="filmography-title"><h3>{credit.title || credit.name}</h3><p>{credit.character ? `As ${credit.character}` : credit.job || ""}</p></div>
        <span className="filmography-type">{credit.media_type === "movie" ? "Film" : "Series"}</span><AudienceRating value={credit.vote_average} /><ArrowUpRight className="filmography-arrow" size={18} />
      </Link>)}</div>
      {!credits.length && <p className="filmography-empty">No {filter === "movie" ? "film" : filter === "tv" ? "series" : ""} credits available.</p>}
    </section>
  </div>;
}
