import Link from "next/link";
import TitleCard from "@/components/discovery/TitleCard";
import { normalizeTitle } from "@/lib/discovery";
import { ArrowUpRight } from "lucide-react";
import BlurImage from "@/components/BlurImage";

export type DetailCast = { id: number; name: string; character: string; profile_path: string | null };
export type DetailRec = { id: number; title?: string; name?: string; poster_path: string | null; vote_average?: number; release_date?: string; first_air_date?: string };

export function DetailNavigation({ episodes }: { episodes?: boolean }) {
  return <nav className="title-detail-nav" aria-label="Title sections">{[...(episodes ? [["episodes", "Episode guide"], ["episode-ratings", "Episode ratings"]] : []), ["title-details", "The details"], ["title-cast", "Cast"], ["title-related", "More like this"]].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>;
}

export function DetailFacts({ facts }: { facts: { label: string; value: string | null | undefined }[] }) {
  return <section id="title-details" className="title-facts"><div><p className="eyebrow">A little more context</p><h2>The details.</h2></div><dl>{facts.filter(fact => fact.value).map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></section>;
}

export function DetailCastSection({ cast }: { cast: DetailCast[] }) {
  if (!cast.length) return null;
  return <section id="title-cast" className="title-cast"><header className="detail-section-heading"><div><p className="eyebrow">The people behind the story</p><h2>The cast.</h2></div><span>{cast.length} cast members</span></header><div className="title-cast-rail" tabIndex={0} role="region" aria-label="Cast members">{cast.map(person => <Link prefetch={false} href={`/person/${person.id}`} key={person.id}><div>{person.profile_path ? <BlurImage src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt="" width={185} height={278} /> : <span>{person.name[0]}</span>}</div><h3>{person.name}</h3><p>{person.character}</p></Link>)}</div></section>;
}

export function DetailRecommendations({ items, type }: { items: DetailRec[]; type: "movie" | "tv" }) {
  if (!items.length) return null;
  return <section id="title-related" className="title-related"><header className="detail-section-heading"><div><p className="eyebrow">Follow the thread</p><h2>More like this.</h2></div><Link prefetch={false} href={`/${type === "movie" ? "films" : "series"}`} className="text-link">Explore {type === "movie" ? "films" : "series"} <ArrowUpRight size={16} /></Link></header><div className="title-related-grid">{items.map(item => { const title = normalizeTitle({ ...item }, type); return title ? <TitleCard key={item.id} item={title} /> : null; })}</div></section>;
}
