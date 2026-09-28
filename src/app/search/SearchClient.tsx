"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MovieDetailsModal from "@/components/MovieDetailsModal";
import TvDetailsModal from "@/components/TvDetailsModal";
import BlurImage from "@/components/BlurImage";
import { useRegionPreference } from "@/lib/useRegionPreference";
import { VALID_REGIONS } from "@/lib/geo";
import { recordSearchInterest } from "@/lib/search-interests";
import TitleCard from "@/components/discovery/TitleCard";
import SearchSuggestions from "@/components/discovery/SearchSuggestions";

const GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10765: "Sci-Fi & Fantasy",
  10768: "War & Politics",
};

type YearOption = "all" | "2020s" | "2010s" | "2000s" | "1990s" | "older";
type SortOption = "relevance" | "popularity" | "rating" | "newest";

const SORTS: { v: SortOption; label: string }[] = [
  { v: "relevance", label: "Relevance" },
  { v: "popularity", label: "Popular" },
  { v: "rating", label: "Top Rated" },
  { v: "newest", label: "Newest" },
];

/* Browse mode (no query) drives /api/getDiscover directly, so every sort /
   year option needs a server-side equivalent. "Relevance" doubles as the
   default top-rated ordering when there's nothing to be relevant to. */
const DISCOVER_SORT: Record<SortOption, { sort_by: string; voteCountGte?: number }> = {
  relevance: { sort_by: "vote_average.desc", voteCountGte: 300 },
  rating: { sort_by: "vote_average.desc", voteCountGte: 300 },
  popularity: { sort_by: "popularity.desc" },
  newest: { sort_by: "primary_release_date.desc", voteCountGte: 50 },
};

const DISCOVER_YEAR: Record<YearOption, { from?: number; to?: number }> = {
  all: {},
  older: { to: 1989 },
  "1990s": { from: 1990, to: 1999 },
  "2000s": { from: 2000, to: 2009 },
  "2010s": { from: 2010, to: 2019 },
  "2020s": { from: 2020 },
};

interface Item {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  profile_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  popularity?: number;
  known_for_department?: string;
  original_language?: string;
}

const itemKey = (it: Item) => `${it.media_type ?? "x"}-${it.id}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Pure sort by criterion (relevance keeps the incoming API order). */
function sortItems(items: Item[], sortBy: SortOption): Item[] {
  if (sortBy === "popularity")
    return [...items].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  if (sortBy === "rating")
    return [...items].sort(
      (a, b) => (b.vote_average || 0) - (a.vote_average || 0),
    );
  if (sortBy === "newest")
    return [...items].sort((a, b) => {
      const dA = new Date(
        a.release_date || a.first_air_date || "1900-01-01",
      ).getTime();
      const dB = new Date(
        b.release_date || b.first_air_date || "1900-01-01",
      ).getTime();
      return dB - dA;
    });
  return items;
}

function toModalMovie(it: Item) {
  return {
    id: it.id,
    title: it.title ?? it.name ?? "",
    overview: it.overview ?? "",
    backdrop_path: it.backdrop_path ?? "",
    genre_ids: it.genre_ids ?? [],
    vote_average: it.vote_average ?? 0,
    release_date: it.release_date ?? it.first_air_date ?? "",
  };
}

interface Filters {
  type: "all" | "movie" | "tv";
  rating: string;
  language: string;
  genre: string;
  year: YearOption;
  includeAdult: boolean;
  sortBy: SortOption;
}

const DEFAULT_FILTERS: Filters = { type: "all", genre: "all", year: "all", includeAdult: false, sortBy: "relevance", rating: "any", language: "any" };
const LANGUAGES = [["any", "Any language"], ["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"], ["ml", "Malayalam"], ["ko", "Korean"], ["ja", "Japanese"], ["fr", "French"], ["es", "Spanish"], ["de", "German"], ["zh", "Chinese"]];

/* Matches MediaGrid's container/column convention exactly, so results read
   as the same grid system as the rest of the app. */
const PAD = "px-(--gutter)";

/* "All" first, then every genre — the Genre filter's option list. */
const GENRE_ENTRIES: [string, string][] = [
  ["all", "All"],
  ...Object.entries(GENRES),
];
const GRID = "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6";

type ResultPageState = { endpoint: string; items: Item[]; page: number; hasMore: boolean; loading: boolean; settled: boolean; error: boolean };
function useResultPages(endpoint: string, isSearch: boolean) {
  const [state, setState] = useState<ResultPageState>({ endpoint, items: [], page: 0, hasMore: true, loading: true, settled: false, error: false });
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async (page: number) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState(previous => ({ ...(previous.endpoint === endpoint && page > 1 ? previous : { endpoint, items: [], page: 0, hasMore: true, settled: false }), loading: true, error: false }));
    try {
      const response = await fetch(`${endpoint}&page=${page}`, { signal: request.signal });
      if (!response.ok) throw new Error("Request failed");
      const json = await response.json();
      if (request.signal.aborted) return;
      const data = isSearch ? json.data : json;
      const items: Item[] = (data?.results ?? []).map((item: Item) => ({ ...item, media_type: item.media_type ?? (item.first_air_date || (!item.title && item.name) ? "tv" : "movie") }));
      setState(previous => {
        const merged = new Map((page > 1 && previous.endpoint === endpoint ? previous.items : []).map(item => [itemKey(item), item]));
        items.forEach(item => merged.set(itemKey(item), item));
        return { endpoint, items: [...merged.values()], page, hasMore: page < (data?.total_pages ?? 1), loading: false, settled: true, error: false };
      });
    } catch {
      if (!request.signal.aborted) setState(previous => ({ ...previous, loading: false, settled: true, error: true }));
    } finally { if (controller.current === request) controller.current = null; }
  }, [endpoint, isSearch]);
  useEffect(() => {
    const timer = setTimeout(() => void load(1), 0);
    return () => { clearTimeout(timer); controller.current?.abort(); };
  }, [load]);
  const current = state.endpoint === endpoint ? state : { endpoint, items: [], page: 0, hasMore: true, loading: true, settled: false, error: false };
  const loadMore = useCallback(() => { if (!controller.current && state.endpoint === endpoint && state.hasMore && state.settled && !state.error) void load(state.page + 1); }, [endpoint, load, state]);
  return { ...current, loadMore, retry: () => void load(current.page + 1) };
}

export default function SearchClient() {
  const searchParams = useSearchParams();
  const writtenQuery = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const urlQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQ);
  const [dq, setDq] = useState(urlQ.trim());

  const [modalItem, setModalItem] = useState<Item | null>(null);
  const { region, changeRegion } = useRegionPreference();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const hasQuery = dq.trim().length > 0;

  useEffect(() => {
    if (urlQ === writtenQuery.current) return;
    queueMicrotask(() => { setQuery(urlQ); setDq(urlQ.trim()); });
  }, [urlQ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = query.trim();
      setDq(next);
      writtenQuery.current = next;
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("q", next); else url.searchParams.delete("q");
      window.history.replaceState(null, "", url.pathname + url.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const browseParams = new URLSearchParams({ type: filters.type === "all" ? "mixed" : filters.type, sort_by: DISCOVER_SORT[filters.sortBy].sort_by });
  const yr = DISCOVER_YEAR[filters.year];
  const votes = DISCOVER_SORT[filters.sortBy].voteCountGte;
  if (votes) browseParams.set("vote_count_gte", String(votes));
  if (filters.genre !== "all") browseParams.set("with_genres", filters.genre);
  if (yr.from) browseParams.set("year_from", String(yr.from));
  if (yr.to) browseParams.set("year_to", String(yr.to));
  if (filters.rating !== "any") browseParams.set("vote_average_gte", filters.rating);
  if (filters.language !== "any") browseParams.set("language", filters.language);
  browseParams.set("include_adult", String(filters.includeAdult));
  if (region) browseParams.set("origin_country", region);
  const searchFilters = new URLSearchParams(browseParams);
  searchFilters.set("type", filters.type);
  const endpoint = hasQuery
    ? `/api/getSearch?query=${encodeURIComponent(dq)}&${searchFilters}`
    : `/api/getDiscover?${browseParams}`;
  const result = useResultPages(endpoint, hasQuery);
  const searchResults = result.items;
  const browseResults = hasQuery ? [] : result.items;
  const searchLoading = result.loading;
  const browseLoading = result.loading;
  const searchHasMore = result.hasMore;
  const browseHasMore = result.hasMore;
  const searchSettled = result.settled;
  const browseSettled = result.settled;

  const { loading: requestLoading, hasMore: requestHasMore, error: requestError, loadMore } = result;


  useEffect(() => {
    const t = setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      try { el.setSelectionRange(end, end); } catch { /* Search inputs may not support selection ranges. */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const searchDisplayed = sortItems(searchResults, filters.sortBy);

  const gridItems = hasQuery ? searchDisplayed : browseResults;
  const loading = hasQuery ? searchLoading : browseLoading;
  const hasMore = hasQuery ? searchHasMore : browseHasMore;
  const settled = hasQuery ? searchSettled : browseSettled;
  const emptyState = hasQuery && gridItems.length === 0 && !hasMore && !loading && settled && !result.error;
  /* Distinct from `emptyState`: this is filters narrowing the top-rated shelf
     to nothing, not a failed search — a quiet inline note, not HAL's line. */
  const browseEmptyState =
    !hasQuery && gridItems.length === 0 && !loading && settled && !result.error;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || (hasQuery && gridItems.length === 0) || requestLoading || !requestHasMore || requestError) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: "600px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasQuery, gridItems.length, requestLoading, requestHasMore, requestError, loadMore]);

  useEffect(() => {
    if (!hasQuery || !settled || loading) return;
    const exact = gridItems.find(item => item.media_type !== "person" && (item.title ?? item.name ?? "").toLocaleLowerCase() === dq.toLocaleLowerCase());
    if (exact?.media_type && exact.media_type !== "person") recordSearchInterest({ id: exact.id, media_type: exact.media_type, title: exact.title ?? exact.name ?? "", genre_ids: exact.genre_ids });
  }, [dq, hasQuery, settled, loading, gridItems]);
  // Keep looking automatically when filters remove a batch, with a bounded budget.
  useEffect(() => {
    if (hasQuery && !gridItems.length && result.page < 5 && hasMore && !loading && settled && !result.error) loadMore();
  }, [hasQuery, gridItems.length, result.page, hasMore, loading, settled, result.error, loadMore]);

  const activeFilters = [
    ...(filters.type !== "all" ? [{ key: "type" as const, label: filters.type === "movie" ? "Films" : "Series" }] : []),
    ...(filters.genre !== "all" ? [{ key: "genre" as const, label: GENRES[Number(filters.genre)] }] : []),
    ...(filters.year !== "all" ? [{ key: "year" as const, label: filters.year === "older" ? "Before 1990" : filters.year }] : []),
    ...(filters.rating !== "any" ? [{ key: "rating" as const, label: `${filters.rating}+ rating` }] : []),
    ...(filters.language !== "any" ? [{ key: "language" as const, label: LANGUAGES.find(([value]) => value === filters.language)?.[1] ?? filters.language }] : []),
    ...(filters.includeAdult ? [{ key: "includeAdult" as const, label: "Include adult" }] : []),
  ];
  const filterFields = [
    { key: "genre" as const, label: "Genre", options: GENRE_ENTRIES.filter(([id]) => filters.type === "all" || (filters.type === "tv" ? !["28", "12", "14", "36", "27", "10402", "10749", "878", "53", "10752"].includes(id) : !["10759", "10765", "10768"].includes(id))) },
    { key: "year" as const, label: "Release period", options: [["all", "Any era"], ["2020s", "2020 onwards"], ["2010s", "2010 – 2019"], ["2000s", "2000 – 2009"], ["1990s", "1990 – 1999"], ["older", "Before 1990"]] },
    { key: "rating" as const, label: "Audience rating", options: [["any", "Any rating"], ["6", "6+ · Worth a look"], ["7", "7+ · Well loved"], ["8", "8+ · Acclaimed"]] },
    { key: "language" as const, label: "Original language", options: LANGUAGES },
    { key: "sortBy" as const, label: "Sort by", options: SORTS.map(option => [option.v, !hasQuery && option.v === "relevance" ? "Recommended" : option.label]) },
  ];

  return (
    <div className="search-page discovery-controls min-h-screen bg-background pt-[66px] text-foreground">
      <section className="search-console" aria-labelledby="search-heading">
        <div className="search-workspace">
          <p className="eyebrow">The archive is yours</p>
          <h1 id="search-heading">What are you<br /><span>looking for?</span></h1>
          <p className="search-intro">Search by title or person, or browse with the filters below.</p>
          <div className="search-query-field"><Search size={22} aria-hidden="true" /><Input ref={inputRef} id="title-search" type="search" value={query} onChange={e => setQuery(e.target.value)} maxLength={100} placeholder="Find a film, series, or person…" aria-label="Search films and series" autoComplete="off" spellCheck={false} />{query && <Button variant="ghost" size="icon" aria-label="Clear search" onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X /></Button>}</div>
          <div className="search-format"><ToggleGroup type="single" value={filters.type} onValueChange={value => { if (value) setFilters(f => ({ ...f, type: value as Filters["type"], genre: "all" })); }} aria-label="Search format"><ToggleGroupItem value="all">Everything</ToggleGroupItem><ToggleGroupItem value="movie">Films</ToggleGroupItem><ToggleGroupItem value="tv">Series</ToggleGroupItem></ToggleGroup><span>{hasQuery ? "Search films, series, and people." : "Or explore without a title in mind."}</span></div>
        </div>
        <figure className="hal-cameo" aria-label="HAL 9000 from 2001: A Space Odyssey">
          <div className="hal-cameo-model"><Hal9000Panel query={query} filtersStr={JSON.stringify(filters)} isActive={hasQuery} isTalking={emptyState} /></div>
          <figcaption><span className="eyebrow">Stanley Kubrick / 1968</span><h2>HAL<br />9000.</h2><p>2001: A Space Odyssey</p><Link prefetch={false} href="/films/62" className="text-link">Explore the film <span aria-hidden="true">↗</span></Link></figcaption>
        </figure>
      </section>
      <section className="search-refine" aria-label="Refine your search">
        <div className="search-refine-heading"><p className="eyebrow">Filter your results</p><Button variant="ghost" size="sm" disabled={!activeFilters.length && filters.sortBy === "relevance"} onClick={() => setFilters(DEFAULT_FILTERS)}>Reset filters</Button></div>
        <FieldGroup className="search-filter-fields"><Field><FieldLabel id="search-region">Region</FieldLabel><Select value={region || "global"} disabled={region === undefined} onValueChange={changeRegion}><SelectTrigger aria-labelledby="search-region" className="min-h-11 w-full"><SelectValue placeholder="Choose a region" /></SelectTrigger><SelectContent className="region-select-content"><SelectGroup><SelectItem value="global">All regions</SelectItem>{[...VALID_REGIONS].map(code => ({ code, name: new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name)).map(country => <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>{filterFields.map(field => <Field key={field.key}><FieldLabel id={`search-${field.key}`}>{field.label}</FieldLabel><Select value={filters[field.key]} onValueChange={value => setFilters(f => ({ ...f, [field.key]: value }))}><SelectTrigger aria-labelledby={`search-${field.key}`} className="min-h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{field.options.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>)}</FieldGroup>
        <div className="search-filter-summary"><div className="search-filter-chips">{activeFilters.map(filter => <Button key={filter.key} variant="outline" size="sm" onClick={() => setFilters(f => ({ ...f, [filter.key]: DEFAULT_FILTERS[filter.key] }))} aria-label={`Remove ${filter.label} filter`}>{filter.label}<X data-icon="inline-end" /></Button>)}{!activeFilters.length && <span>Every genre. Every era. Open to anything.</span>}</div><label className="search-adult"><input type="checkbox" checked={filters.includeAdult} onChange={e => setFilters(f => ({ ...f, includeAdult: e.target.checked }))} />Include adult titles</label></div>
      </section>

      {/* Results stay separate from the query and filter workspace. */}
      <div className="relative z-10 bg-[#010101] pt-8 pb-28 md:pb-16 lg:min-h-[50vh]">
        <div className={cn(PAD, "mx-auto w-full")}>
          <div className="search-results-heading"><h2>{hasQuery ? `Results for “${dq}”` : "Browse films and series"}</h2><p role="status">{loading ? "Searching…" : `${gridItems.length} ${hasQuery ? "matches" : "titles"}${hasMore ? " · More to explore" : ""}`}</p></div>
          {hasQuery && (filters.genre !== "all" || filters.year !== "all" || filters.rating !== "any" || filters.language !== "any" || filters.sortBy !== "relevance") && <p className="search-results-note">Filters apply as we search through the catalogue. Sorting applies to loaded matches. Region shapes browse results and suggestions; title searches include every region.</p>}
          {hasQuery && !gridItems.length && hasMore && !loading && settled && !result.error && <div className="search-no-matches"><h3>Still looking for a match.</h3><p>Try fewer filters or search the next set of titles.</p><Button variant="outline" onClick={loadMore}>Search more matches</Button></div>}
          {result.error && <div role="alert" className="search-error"><p>Search couldn’t load. Please try again.</p><button type="button" onClick={result.retry}>Try again</button></div>}
          {gridItems.length === 0 && (loading || !settled) && (
            <div className={GRID}>
              {[...Array(18)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {gridItems.length > 0 && (
            <div className={GRID}>
              {gridItems.map((item, i) => (
                <ResultCard
                  key={itemKey(item)}
                  item={item}
                  onOpen={setModalItem}
                  index={i}
                />
              ))}
              {loading &&
                [...Array(12)].map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
            </div>
          )}

          {emptyState && (
            <>
              <div className="search-no-matches"><p className="eyebrow">Search results</p><h3>No matching titles found.</h3><p>Try another title or loosen a filter. Here are a few other directions to explore.</p><Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset filters</Button></div>

            </>
          )}

          {browseEmptyState && (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <p className="font-manrope text-[15px] text-white/55">
                Nothing matches that combination of filters.
              </p>
              <button
                onClick={() =>
                  setFilters(DEFAULT_FILTERS)
                }
                className="font-manrope text-[13px] font-semibold uppercase tracking-[0.08em] text-white underline underline-offset-4 transition-colors hover:text-white/75"
              >
                Reset filters
              </button>
            </div>
          )}

          {settled && !loading && <SearchSuggestions query={browseParams.toString()} region={region} empty={emptyState || browseEmptyState || result.error || !gridItems.length} />}

          <div ref={sentinelRef} className="flex justify-center py-12">
            {!hasMore && gridItems.length > 0 && (
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-600">
                End of results
              </p>
            )}
          </div>
        </div>
      </div>

      {modalItem?.media_type === "tv" && <TvDetailsModal show={{ id: modalItem.id, name: modalItem.name ?? modalItem.title ?? "", overview: modalItem.overview ?? "", backdrop_path: modalItem.backdrop_path ?? "", genre_ids: modalItem.genre_ids ?? [], vote_average: modalItem.vote_average ?? 0, first_air_date: modalItem.first_air_date ?? "" }} onClose={() => setModalItem(null)} />}
      {modalItem?.media_type !== "tv" && modalItem && (
        <MovieDetailsModal
          movie={toModalMovie(modalItem)}
          providers={[]}
          onClose={() => setModalItem(null)}
        />
      )}
    </div>
  );
}

function ResultCard({ item, onOpen }: { item: Item; onOpen: (item: Item) => void; index: number }) {
  if (item.media_type === "person") return <article className="media-card"><Link prefetch={false} className="media-card-art" href={`/person/${item.id}`} aria-label={`Explore ${item.name}`}>
    {item.profile_path ? <BlurImage src={`https://image.tmdb.org/t/p/w342${item.profile_path}`} alt="" width={342} height={513} /> : <span className="media-card-fallback">{item.name}</span>}
  </Link><div className="media-card-copy"><p className="media-card-meta">Person / {item.known_for_department || "Film & television"}</p><div className="media-card-heading"><h3><Link prefetch={false} href={`/person/${item.id}`}>{item.name}</Link></h3></div></div></article>;
  return <TitleCard item={{ ...item, title: item.title || item.name || "Untitled", poster_path: item.poster_path ?? null, media_type: item.media_type || "movie", date: item.release_date || item.first_air_date || "" }} onOpen={() => onOpen(item)} />;
}

function SkeletonCard() {
  return <div className="aspect-[2/3] animate-pulse bg-white/[0.03]" />;
}

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function Hal9000Panel({
  query,
  filtersStr,
  isActive,
  isTalking,
}: {
  query: string;
  filtersStr: string;
  isActive: boolean;
  isTalking: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const eyeCoreRef = useRef<HTMLDivElement>(null);
  const reflectionRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [prevQuery, setPrevQuery] = useState(query);
  const [prevFilters, setPrevFilters] = useState(filtersStr);
  const [isHover, setIsHover] = useState(false);

  const isAdultEnabled = useMemo(() => {
    try {
      const f = JSON.parse(filtersStr || "{}");
      return f.includeAdult === true;
    } catch {
      return false;
    }
  }, [filtersStr]);

  // Mouse tracking & parallax — HAL's eye follows the cursor across the page.
  useIso(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const handleMouseMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const xPos = (clientX - centerX) / centerX;
        const yPos = (clientY - centerY) / centerY;

        // Core tracks the cursor
        gsap.to(eyeCoreRef.current, {
          x: xPos * 14,
          y: yPos * 14,
          duration: 1.4,
          ease: "power2.out",
        });

        // The lamp halo trails the core, a touch slower
        gsap.to(glowRef.current, {
          x: xPos * 9,
          y: yPos * 9,
          duration: 1.7,
          ease: "power2.out",
        });

        // Reflection moves oppositely for parallax depth
        gsap.to(reflectionRef.current, {
          x: xPos * -6,
          y: yPos * -6,
          duration: 1.5,
          ease: "power2.out",
        });

        // Slight 3D tilt of the entire panel
        gsap.to(containerRef.current, {
          rotateY: xPos * 7,
          rotateX: yPos * -7,
          duration: 2,
          ease: "power2.out",
        });
      };
      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    });
    return () => ctx.revert();
  }, []);

  // Idle blink — the lens iris contracts and springs back at random intervals,
  // the way a live camera aperture re-settles. Gives HAL a pulse when otherwise still.
  useIso(() => {
    if (prefersReducedMotion()) return;
    const core = eyeCoreRef.current;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout>;
    const blink = () => {
      if (cancelled) return;
      gsap.killTweensOf(core, "scale");
      gsap
        .timeline()
        .to(core, { scale: 0.62, duration: 0.08, ease: "power2.in" })
        .to(core, { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.5)" });
      t = setTimeout(blink, 3600 + Math.random() * 5200);
    };
    t = setTimeout(blink, 3000 + Math.random() * 4000);
    return () => {
      cancelled = true;
      clearTimeout(t);
      gsap.killTweensOf(core, "scale");
    };
  }, []);

  // Typing & Filter Interaction
  useIso(() => {
    const queryChanged = query !== prevQuery;
    const filtersChanged = filtersStr !== prevFilters;

    if (!queryChanged && !filtersChanged) return;
    setPrevQuery(query);
    setPrevFilters(filtersStr);

    // Aperture slightly closes and re-opens when processing new input or filters
    gsap.killTweensOf(eyeCoreRef.current, "scale");
    gsap
      .timeline()
      .to(eyeCoreRef.current, {
        scale: 0.85,
        duration: 0.1,
        ease: "power2.out",
      })
      .to(eyeCoreRef.current, {
        scale: 1,
        duration: 0.5,
        ease: "power2.out",
      });
  }, [query, prevQuery, filtersStr, prevFilters]);

  // Mood / state lighting. The big bloom now lives on a dedicated halo element
  // (glowRef) so it stays a controlled lamp glow instead of a giant box-shadow
  // smear — the core keeps only its tight filament shadows.
  useIso(() => {
    const core = eyeCoreRef.current;
    const glow = glowRef.current;
    if (!core || !glow) return;

    const reduce = prefersReducedMotion();
    gsap.killTweensOf(core, "background,boxShadow,borderColor");
    gsap.killTweensOf(glow, "opacity,scale,backgroundImage");

    // ── tight filament shadows on the 25px core ──
    const NORMAL_CORE =
      "inset 0 0 1px 1px #7f0210, inset 0 0 2px 2px #cb1a36, inset 0 0 5px 3px #f15a54, inset 0 0 10px 4px #fcc5a4, 0 0 3px 2px #7f0210, 0 0 14px 8px #7f0210, 0 0 28px 12px #5e0109";
    const ENGAGED_CORE =
      "inset 0 0 1px 1px #7f0210, inset 0 0 2px 2px #d11a36, inset 0 0 6px 3px #ff6a60, inset 0 0 11px 4px #ffd8b8, 0 0 4px 2px #7f0210, 0 0 18px 10px #8a0210, 0 0 34px 15px #6e0109";
    // 18+ — innermost rings kept hot (no dark band hugging the core edge), the
    // bloom still falls off to deep red further out.
    const ADULT_CORE =
      "inset 0 0 1px 1px #ff4a30, inset 0 0 2px 2px #ff3422, inset 0 0 6px 3px #ff5a4a, inset 0 0 12px 5px #ffe0d6, 0 0 4px 3px #ff2a18, 0 0 20px 12px #c81810, 0 0 40px 18px #8a0000";
    const TALK_CORE =
      "inset 0 0 1px 1px #7f0210, inset 0 0 2px 2px #cb1a36, inset 0 0 4px 2px #f15a54, inset 0 0 8px 3px #fcc5a4, 0 0 3px 2px #7f0210, 0 0 10px 6px #7f0210, 0 0 22px 9px #5e0109";

    const GLOW_BASE =
      "radial-gradient(circle, rgba(255,60,40,0.95) 0%, rgba(220,20,20,0.55) 38%, rgba(120,0,0,0) 72%)";
    const GLOW_ADULT =
      "radial-gradient(circle, rgba(255,130,70,1) 0%, rgba(255,34,22,0.72) 34%, rgba(150,0,0,0) 74%)";

    if (isTalking) {
      // HAL is answering "I'm sorry, Dave" — a slow, resigned dimming breath.
      gsap.set(glow, { backgroundImage: GLOW_BASE });
      if (reduce) {
        gsap.set(core, {
          background: "#ffe0e0",
          boxShadow: TALK_CORE,
          borderColor: "#7f0210",
        });
        gsap.set(glow, { opacity: 0.16, scale: 0.92 });
        return;
      }
      gsap.set(core, { borderColor: "#7f0210" });
      gsap.to(core, {
        background: "#ffe0e0",
        boxShadow: TALK_CORE,
        duration: 1.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.fromTo(
        glow,
        { opacity: 0.1, scale: 0.82 },
        {
          opacity: 0.22,
          scale: 0.98,
          duration: 1.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        },
      );
    } else if (isAdultEnabled) {
      // 18+ — hot, watchful, a slow menacing heartbeat. Contained, not a blob.
      gsap.set(glow, { backgroundImage: GLOW_ADULT });
      gsap.to(core, {
        background: "#fff0f0",
        boxShadow: ADULT_CORE,
        borderColor: "#ff3a24", // hot rim — kills the dark ring under the bright bloom
        duration: 0.6,
        ease: "power2.out",
      });
      if (reduce) {
        gsap.set(glow, { opacity: 0.72, scale: 1.12 });
        return;
      }
      gsap.set(glow, { opacity: 0.5, scale: 1 });
      gsap.to(glow, {
        keyframes: [
          { opacity: 0.95, scale: 1.22, duration: 0.42, ease: "power3.out" },
          { opacity: 0.6, scale: 1.05, duration: 0.5, ease: "sine.inOut" },
          { opacity: 0.82, scale: 1.15, duration: 0.3, ease: "power2.out" },
          { opacity: 0.5, scale: 1.0, duration: 1.5, ease: "sine.inOut" },
        ],
        repeat: -1,
        repeatDelay: 0.25,
      });
    } else {
      // Idle / browsing. When a query is live or HAL is hovered it leans alert.
      const engaged = isHover || isActive;
      gsap.set(glow, { backgroundImage: GLOW_BASE });
      gsap.to(core, {
        background: "#fdffff",
        boxShadow: engaged ? ENGAGED_CORE : NORMAL_CORE,
        borderColor: "#7f0210",
        duration: 1,
        ease: "power2.out",
      });
      if (reduce) {
        gsap.set(glow, {
          opacity: engaged ? 0.34 : 0.2,
          scale: engaged ? 1.12 : 1.04,
        });
        return;
      }
      gsap.fromTo(
        glow,
        { opacity: engaged ? 0.32 : 0.14, scale: engaged ? 1.06 : 1.0 },
        {
          opacity: engaged ? 0.52 : 0.3,
          scale: engaged ? 1.2 : 1.09,
          duration: engaged ? 1.9 : 2.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        },
      );
    }
  }, [isTalking, isAdultEnabled, isHover, isActive]);

  // Click HAL → a quick "acknowledged" aperture pop. Pure easter-egg delight.
  const handleAcknowledge = useCallback(() => {
    const core = eyeCoreRef.current;
    if (!core || prefersReducedMotion()) return;
    gsap.killTweensOf(core, "scale");
    gsap
      .timeline()
      .to(core, { scale: 0.55, duration: 0.08, ease: "power2.in" })
      .to(core, { scale: 1.3, duration: 0.13, ease: "power2.out" })
      .to(core, { scale: 1, duration: 0.45, ease: "elastic.out(1, 0.45)" });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onClick={handleAcknowledge}
      role="img"
      aria-label="HAL 9000 camera eye"
      className="relative z-30 flex cursor-pointer flex-col p-[10px]"
      style={{
        width: "248px",
        height: "660px",
        background: "linear-gradient(45deg, #2a2a2a, #111111)",
        border: "2px solid #333333",
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-50px)] h-[calc(100%-50px)] -z-10"
        style={{
          boxShadow: "0 20px 50px rgba(0,0,0,0.9)",
        }}
      />

      {/* Body */}
      <div
        className="relative mb-[12px] flex-[0_0_73%]"
        style={{
          background: "linear-gradient(45deg, #262425, #141314)",
          boxShadow: "inset 1px -1px 3px 4px #0d0c0d",
        }}
      >
        {/* Name Tag */}
        <div
          className="pt-[20px] px-[15px]"
          style={{
            fontFamily: '"Assistant", sans-serif',
            fontSize: "31px",
            fontWeight: 800,
            color: "rgba(255,255,255,0.8)",
            WebkitTextFillColor: "transparent",
            WebkitTextStrokeWidth: "0.5px",
            WebkitTextStrokeColor: "rgba(255,255,255,0.8)",
          }}
        >
          <div className="relative flex h-[40px] leading-[1.15]">
            <div className="flex-[0_0_50%] px-[7px] text-right bg-[#027c93]">
              HAL
            </div>
            <div
              className="flex-[0_0_50%] px-[7px] bg-[rgba(255,255,255,0.05)]"
              style={{
                borderTop: "1px solid #027c93",
                borderBottom: "1px solid #027c93",
                lineHeight: "33px",
              }}
            >
              9000
            </div>
          </div>
        </div>

        {/* Eye Section */}
        <div className="flex justify-center">
          {/* Layer 1 */}
          <div
            className="absolute bottom-[30px] flex items-center justify-center rounded-full"
            style={{
              width: "200px",
              height: "200px",
              background:
                "linear-gradient(45deg, rgba(255,255,255,0.2), #111111)",
              boxShadow: "1px -1px 4px 3px rgba(0,0,0,0.9)",
            }}
          >
            <div
              className="absolute top-[5px] left-[5px] flex items-center justify-center rounded-full"
              style={{
                width: "190px",
                height: "190px",
                background: "linear-gradient(45deg, #222222, #444444)",
                boxShadow:
                  "-1px 1px 0 rgba(255,255,255,0.1), 1px -1px 0 rgba(255,255,255,0.2)",
              }}
            />
            {/* Layer 2 */}
            <div
              className="relative flex items-center justify-center rounded-full z-10"
              style={{
                width: "175px",
                height: "175px",
                background:
                  "linear-gradient(45deg, black 0%, #333333 50%, black 100%)",
                boxShadow:
                  "-1px 1px 1px 1px #050505, 1px 1px 3px 2px #0d0d0d, inset 1px -1px 0px #404040",
              }}
            >
              {/* Layer 3 */}
              <div
                className="relative flex items-center justify-center rounded-full z-10"
                style={{
                  width: "160px",
                  height: "160px",
                  background:
                    "linear-gradient(180deg, black 0%, #0d0d0d 50%, black 100%)",
                }}
              >
                {/* Layer 4 */}
                <div
                  className="relative flex items-center justify-center rounded-full z-10 rotate-[-125deg]"
                  style={{
                    width: "150px",
                    height: "150px",
                    background:
                      "radial-gradient(ellipse, rgba(0,0,0,1) 0%, rgba(41,41,41,1) 24%, rgba(10,10,10,1) 27%, rgba(10,10,10,1) 47%, rgba(10,10,10,1) 50%, rgba(26,26,26,1) 58%, rgba(0,0,0,1) 59%, rgba(0,0,0,1) 81%, rgba(43,43,43,1) 86%, rgba(0,0,0,1) 90%, rgba(71,71,71,1) 92%, rgba(0,0,0,1) 100%)",
                    boxShadow:
                      "0 60px 30px rgba(0,0,0,0.5), 0px 14px 20px 20px rgba(0,0,0,0.5)",
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "linear-gradient(170deg, rgba(255,255,255,0.2) 0%, transparent 50%, transparent 70%, rgba(66,1,8,0.6) 90%)",
                      boxShadow: "inset -3px 3px 5px 1px rgba(0,0,0,0.8)",
                    }}
                  />
                  <div
                    ref={reflectionRef}
                    className="absolute inset-0 rounded-full blur-[8px]"
                    style={{
                      background:
                        "radial-gradient(transparent 0%, transparent 26%, rgba(255,255,255,0.05) 27%, rgba(255,255,255,0.1) 33%, transparent 34%, transparent 46%, rgba(255,255,255,0.1) 48%, rgba(255,255,255,0.1) 55%, transparent 57%, transparent 100%)",
                      backgroundSize: "222px 273px",
                      backgroundPosition: "top center",
                      backgroundRepeat: "no-repeat",
                      transform: "perspective(24px) rotate3d(1, 0, 0, -18deg)",
                      transformOrigin: "top",
                    }}
                  />

                  {/* Lamp halo — the big bloom, kept contained inside the lens.
                      GSAP drives its opacity / scale / hue per HAL's mood. */}
                  <div
                    ref={glowRef}
                    className="pointer-events-none absolute inset-0 m-auto rounded-full"
                    style={{
                      width: "64px",
                      height: "64px",
                      background:
                        "radial-gradient(circle, rgba(255,60,40,0.95) 0%, rgba(220,20,20,0.55) 38%, rgba(120,0,0,0) 72%)",
                      filter: "blur(9px)",
                      mixBlendMode: "screen",
                      opacity: 0.18,
                    }}
                  />

                  {/* Layer Red (The Core) */}
                  <div
                    ref={eyeCoreRef}
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                      width: "25px",
                      height: "25px",
                      background: "#fdffff",
                      border: "1px solid #7f0210",
                      boxShadow:
                        "inset 0 0 1px 1px #7f0210, inset 0 0 2px 2px #cb1a36, inset 0 0 5px 3px #f15a54, inset 0 0 10px 4px #fcc5a4, 0 0 3px 2px #7f0210, 0 0 14px 8px #7f0210, 0 0 28px 12px #5e0109",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Speaker */}
      <div
        className="relative flex-1"
        style={{
          background:
            "linear-gradient(to bottom, #111 0%, #222 27%, #222 45%, #444 59%, #444 74%, #444 92%, #111 100%)",
          backgroundRepeat: "repeat",
          backgroundSize: "auto 9px",
          backgroundPosition: "top",
          boxShadow: "inset 1px -1px 2px 0px rgba(0,0,0,0.9)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(black 0%, #1a1a1a 12%, transparent 19%, transparent 100%)",
            backgroundSize: "11px 9px",
            backgroundPosition: "0px -2px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(45deg, transparent 50%, rgba(0,0,0,0.25))",
          }}
        />
      </div>
    </div>
  );
}

