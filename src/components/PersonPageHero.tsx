"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDown } from "lucide-react";
import BlurImage from "@/components/BlurImage";
import { Button } from "@/components/ui/button";

interface Props {
  name: string;
  department: string;
  biography: string;
  profilePath: string | null;
  backdropPath: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  creditsCount: number;
  yearsActive: string | null;
  departments: string[];
  knownForTitles: string[];
  externalLinks: { label: string; url: string }[];
  profiles?: { file_path: string }[];
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
}

export default function PersonPageHero({ name, department, biography, profilePath, backdropPath, birthday, deathday, placeOfBirth, creditsCount, yearsActive, externalLinks, profiles = [] }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activePhoto, setActivePhoto] = useState(profilePath);
  const photos = [...new Set([profilePath, ...profiles.map(photo => photo.file_path)].filter((path): path is string => Boolean(path)))].slice(0, 8);
  const facts = [
    { label: "Born", value: birthday ? formatDate(birthday) : null },
    { label: "From", value: placeOfBirth },
    { label: "Credits span", value: yearsActive },
    { label: "Died", value: deathday ? formatDate(deathday) : null },
  ].filter(fact => fact.value);
  return <div className="person-profile discovery-controls">
    <header className="cinematic-hero person-scene">
      {backdropPath && <div className="cinematic-art person-scene-backdrop" aria-hidden="true"><BlurImage src={`https://image.tmdb.org/t/p/w1280${backdropPath}`} alt="" width={1280} height={720} lazy={false} /></div>}
      {activePhoto && <div className="person-scene-portrait"><BlurImage key={activePhoto} src={`https://image.tmdb.org/t/p/h632${activePhoto}`} alt={name} width={632} height={948} lazy={false} /></div>}
      <div className="cinematic-scrim" />
      <Link prefetch={false} href="/search" className="scene-back"><ArrowLeft size={16} /><span>Discover people</span></Link>
      <div className="scene-content"><p className="scene-kicker">In the spotlight / {department}</p><h1 className="scene-title">{name}</h1><div className="person-scene-meta"><span>{creditsCount} credited titles</span>{yearsActive && <span>Credits / {yearsActive}</span>}</div><a href="#filmography" className="collection-browse">Explore the work<ArrowDown size={18} /></a></div>
      <a href="#biography-heading" className="scene-scroll"><span>Behind the screen</span><ArrowDown size={18} /></a>
    </header>
    <section className="person-profile-body">
      <aside><p className="eyebrow">A closer look</p><h2 id="biography-heading">Behind the screen.</h2>{photos.length > 1 && <div className="person-photo-strip" role="group" aria-label={`Portraits of ${name}`}>{photos.map((path, index) => <button key={path} type="button" onClick={() => setActivePhoto(path)} aria-label={`View portrait ${index + 1} of ${name}`} aria-pressed={path === activePhoto}><BlurImage src={`https://image.tmdb.org/t/p/w185${path}`} alt="" width={60} height={90} /></button>)}</div>}
      {facts.length > 0 && <dl className="person-facts">{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
      {externalLinks.length > 0 && <nav className="person-links" aria-label={`${name} elsewhere`}>{externalLinks.map(link => <a className="text-link" key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={14} /></a>)}</nav>}</aside>
      <div className="person-biography"><p className="eyebrow">Biography</p><p id="person-biography" className={!expanded && biography.length > 650 ? "person-biography-clamped" : undefined}>{biography || "A biography isn’t available yet. Explore their work below."}</p>{biography.length > 650 && <Button variant="link" className="person-bio-toggle" aria-expanded={expanded} aria-controls="person-biography" onClick={() => setExpanded(value => !value)}>{expanded ? "Read less" : "Read full biography"} <ArrowUpRight data-icon="inline-end" /></Button>}</div>
    </section>
  </div>;
}
