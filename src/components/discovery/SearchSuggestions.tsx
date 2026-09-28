"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/client-api";
import { getTasteProfile } from "@/lib/taste";
import { getSearchInterests } from "@/lib/search-interests";
import { fallbackFeed } from "@/lib/discovery-fallback";
import { matchesSearchFilters } from "@/lib/search-filters";
import { normalizeTitle, fillLane, titleKey, type DiscoveryTitle } from "@/lib/discovery";
import TitleCard from "./TitleCard";

export default function SearchSuggestions({ query, region, empty }: { query: string; region?: string | null; empty: boolean }) {
  const [selection, setSelection] = useState<{ key: string; items: DiscoveryTitle[]; wider: boolean; saved: boolean } | null>(null);
  const key = `${query}:${region ?? "global"}`;
  useEffect(() => {
    if (region === undefined) return;
    let cancelled = false;
    const params = new URLSearchParams(query);
    params.set("page", "1");
    if (region) params.set("origin_country", region);
    const type = params.get("type");
    const anchors = [...(getTasteProfile()?.anchors ?? []), ...getSearchInterests()].filter(item => type === "mixed" || item.media_type === type).slice(0, 2);
    const getPicks = async () => {
      const [discovery, ...recs] = await Promise.allSettled([
        fetchJson<{ results?: Record<string, unknown>[] }>(`/api/getDiscover?${params}`),
        ...anchors.map(anchor => fetchJson<{ results?: Record<string, unknown>[] }>(`/api/${anchor.media_type === "movie" ? "getMovieRecommendations" : "getTvRecommendations"}?id=${anchor.id}`).then(data => ({ results: data.results?.map(item => ({ ...item, media_type: anchor.media_type })) }))),
      ]);
      const pool = [discovery, ...recs].flatMap(result => result.status === "fulfilled" ? result.value.results ?? [] : []).flatMap(raw => { const item = normalizeTitle(raw); return item && matchesSearchFilters(item, params) ? [item] : []; });
      const saved = pool.length === 0;
      const fallback = fallbackFeed(new URLSearchParams({ format: type === "mixed" ? "all" : type ?? "all", ...(region ? { region } : {}) })).lanes.flatMap(lane => lane.items);
      const matching = fallback.filter(item => matchesSearchFilters(item, params));
      const items = fillLane(pool.length ? pool : matching.length ? matching : fallback, 6, 1, new Set(), region);
      if (!cancelled) setSelection({ key, items, wider: !pool.length && !matching.length, saved });
    };
    void getPicks();
    return () => { cancelled = true; };
  }, [query, region, key]);
  const current = selection?.key === key ? selection : null;
  return <section className="search-suggestions" aria-label="Suggested titles" aria-busy={!current}>
    <div className="lane-heading"><div><h2>{empty ? "You might like these" : "More for you"}</h2><p>{current?.wider ? "These suggestions broaden your filters and keep your chosen format." : current?.saved ? "From our saved selection. Ratings may have changed." : "Suggestions based on your filters, region, and titles you’ve explored."}</p></div><Link prefetch={false} href="/collections" className="text-link">Browse collections</Link></div>
    <div className="discovery-grid">{current ? current.items.map(item => <TitleCard key={titleKey(item)} item={item} />) : <p role="status">Finding suggestions…</p>}</div>
  </section>;
}
