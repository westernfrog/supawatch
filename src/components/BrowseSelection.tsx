"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import CinemaShelf, { PosterCard } from "@/components/CinemaShelf";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GENRE_LIST, TV_GENRE_LIST } from "@/lib/genres";
import { useWatchlist } from "@/lib/watchlist";
import { useRegionPreference } from "@/lib/useRegionPreference";
import { VALID_REGIONS } from "@/lib/geo";
import { titleKey } from "@/lib/discovery";

type Filters = { genre: string; period: string; rating: string; length: string; sort: string };

export default function BrowseSelection({ mediaType, genre }: { mediaType: "movie" | "tv"; genre?: string }) {
  const { region, changeRegion } = useRegionPreference();
  const film = mediaType === "movie";
  const id = useId();
  const defaults: Filters = { genre: genre || "any", period: "any", rating: "any", length: "any", sort: "popularity.desc" };
  const [filters, setFilters] = useState<Filters>(defaults);
  const changed = Object.keys(defaults).some(key => filters[key as keyof Filters] !== defaults[key as keyof Filters]);
  const query = new URLSearchParams({ type: mediaType, sort_by: filters.sort, vote_count_gte: filters.sort === "vote_average.desc" ? "500" : "100" });
  if (filters.genre !== "any") query.set("with_genres", filters.genre);
  if (filters.rating !== "any") query.set("vote_average_gte", filters.rating);
  if (filters.period !== "any") { const [from, to] = filters.period.split(":"); query.set("year_from", from); query.set("year_to", to); }
  if (filters.length !== "any") {
    if (film) { const [from, to] = filters.length.split(":"); query.set("with_runtime_gte", from); query.set("with_runtime_lte", to); }
    else query.set("with_networks", filters.length);
  }
  const year = new Date().getUTCFullYear();
  const genres = (film ? GENRE_LIST : TV_GENRE_LIST).map(item => [item.id, item.name]);
  if (genre && !genres.some(([value]) => value === genre)) genres.unshift([genre, "Selected genres"]);
  const fields: { key: keyof Filters; label: string; options: string[][] }[] = [
    { key: "genre", label: "Genre", options: [["any", "All genres"], ...genres] },
    { key: "period", label: "Release period", options: [["any", "Any era"], [`${year}:${year}`, "This year"], [`${year - 1}:${year}`, "Recent releases"], ["2020:2029", "2020s"], ["2010:2019", "2010s"], ["2000:2009", "2000s"], ["1990:1999", "1990s"], ["1900:1989", "Before 1990"]] },
    { key: "rating", label: "Audience rating", options: [["any", "Any rating"], ["6", "6+ / Worth a look"], ["7", "7+ / Well liked"], ["8", "8+ / Highly rated"]] },
    { key: "length", label: film ? "Running time" : "Network", options: film ? [["any", "Any length"], ["1:90", "90 minutes or less"], ["91:120", "91–120 minutes"], ["121:1000", "Over two hours"]] : [["any", "Any network"], ["49", "HBO"], ["213", "Netflix"], ["2552", "Apple TV+"], ["1024", "Prime Video"]] },
    { key: "sort", label: "Sort by", options: [["popularity.desc", "Popular now"], ["vote_average.desc", "Highest rated"], ["vote_count.desc", "Most rated"], [film ? "primary_release_date.desc" : "first_air_date.desc", "Newest first"]] },
  ];
  return <section className="browse-selection" aria-label={`Find ${film ? "films" : "series"}`}>
    <div className="browse-selection-fields"><div><label id={`${id}-region`}>Region</label><Select value={region || "global"} disabled={region === undefined} onValueChange={changeRegion}><SelectTrigger aria-labelledby={`${id}-region`}><SelectValue /></SelectTrigger><SelectContent className="region-select-content"><SelectGroup><SelectItem value="global">All regions</SelectItem>{[...VALID_REGIONS].map(code => ({ code, name: new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code })).sort((a,b) => a.name.localeCompare(b.name)).map(country => <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div>{fields.map(field => <div key={field.key}><label id={`${id}-${field.key}`}>{field.label}</label><Select value={filters[field.key]} onValueChange={value => setFilters(current => ({ ...current, [field.key]: value }))}><SelectTrigger aria-labelledby={`${id}-${field.key}`}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{field.options.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent></Select></div>)}</div>
    {changed && <div className="browse-selection-reset"><p>Your selection updates as you change the fields.</p><Button variant="ghost" onClick={() => setFilters(defaults)}>Reset filters</Button></div>}
    <CinemaShelf id="your-selection" title={changed ? "Exactly what you asked for." : film ? "What everyone's watching." : "What everyone's streaming."} fetchUrl={`/api/getDiscover?${query}`} mediaType={mediaType} limit={20} />
  </section>;
}

export function SavedBrowseShelf({ mediaType }: { mediaType: "movie" | "tv" }) {
  const titles = useWatchlist().filter(item => item.media_type === mediaType && item.poster_path).slice(0, 12);
  if (!titles.length) return null;
  return <section className="poster-shelf" aria-label="Saved titles"><header className="poster-shelf-heading"><div><p className="eyebrow">My List</p><h2>{mediaType === "movie" ? "Waiting for you." : "Queued up and waiting."}</h2></div><Link prefetch={false} className="text-link" href="/watchlist">View My List <ArrowUpRight size={16} /></Link></header><div className="poster-rail" tabIndex={0} role="region" aria-label="Your saved titles">{titles.map(item => <PosterCard key={titleKey(item)} item={item} story={false} />)}</div></section>;
}
