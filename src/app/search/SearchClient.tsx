"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import MovieDetailsModal from "@/components/MovieDetailsModal";
import BlurImage from "@/components/BlurImage";

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
};

type YearOption = "all" | "2020s" | "2010s" | "2000s" | "1990s" | "older";
type SortOption = "relevance" | "popularity" | "rating" | "newest";

/* Ordered stops for the year slider (chronological → newest on the right). */
const YEAR_STOPS: { v: YearOption; label: string }[] = [
  { v: "all", label: "All" },
  { v: "older", label: "‹’90" },
  { v: "1990s", label: "’90s" },
  { v: "2000s", label: "’00s" },
  { v: "2010s", label: "’10s" },
  { v: "2020s", label: "’20s" },
];

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
}

/* Genres HAL can pull the fallback shelf from — one at random.
   Sci-Fi, Adventure, Horror. */
const GENRE_IDS = ["878", "12", "27"];
const randomGenreId = () =>
  GENRE_IDS[Math.floor(Math.random() * GENRE_IDS.length)];

const itemKey = (it: Item) => `${it.media_type ?? "x"}-${it.id}`;

/* HAL's one and only answer when the database comes up empty — the line. */
const HAL_LINE = "I'm sorry, Dave. I'm afraid I can't do that.";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Fisher–Yates shuffle, in place. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* Fallback shelf for the empty state. Picks a random genre, then samples random
   pages from across its credibly-voted catalogue (capped at page 200) and keeps
   a random `want` of them — so the shelf is different every time. Robust: learns
   each genre's real page count, retries other genres if one is thin, never throws. */
async function fetchTopRatedShelf(want: number): Promise<Item[]> {
  const MAX_PAGE = 200;
  const SAMPLE_PAGES = 4; // random pages to pull (≈80 titles) beyond the head
  const tried = new Set<string>();
  let best: Item[] = [];

  for (let attempt = 0; attempt < 3 && best.length < want; attempt++) {
    let genre = randomGenreId();
    for (let g = 0; tried.has(genre) && g < 10; g++) genre = randomGenreId();
    tried.add(genre);

    const url = (page: number) =>
      `/api/getMoviesByGenre?id=${genre}&page=${page}` +
      `&sort_by=vote_average.desc&vote_count_gte=150`;

    try {
      // page 1 doubles as the source of truth for how many pages exist
      const head = await fetch(url(1)).then((r) => r.json());
      const cap = Math.min(MAX_PAGE, Math.max(1, head?.total_pages ?? 1));

      const pageNums = new Set<number>();
      for (
        let g = 0;
        pageNums.size < Math.min(SAMPLE_PAGES, cap) && g < 60;
        g++
      )
        pageNums.add(1 + Math.floor(Math.random() * cap));

      const rest = await Promise.all(
        [...pageNums].map((p) => fetch(url(p)).then((r) => r.json())),
      );

      const seen = new Set<number>();
      const items: Item[] = [head, ...rest]
        .flatMap((p) => (p?.results ?? []) as Item[])
        .filter((m) => {
          if (!m.poster_path || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        })
        .map((m) => ({ ...m, media_type: "movie" as const }));

      if (items.length > best.length) best = items;
    } catch {
      /* try another genre */
    }
  }

  return shuffle(best).slice(0, want);
}

/* Empty-state shelves, cached per not-found query and keyed at module scope so
   they survive client navigation (leaving /search and coming back). A given
   query always shows the same shelf; a *different* not-found search rolls a new
   one. Bounded so it can't grow without limit over a long session. */
const shelfCache = new Map<string, Item[]>();
function cacheShelf(key: string, items: Item[]) {
  shelfCache.set(key, items);
  if (shelfCache.size > 12) {
    const oldest = shelfCache.keys().next().value;
    if (oldest !== undefined) shelfCache.delete(oldest);
  }
}

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
  genre: string;
  year: YearOption;
  includeAdult: boolean;
  sortBy: SortOption;
}

/* Matches MediaGrid's container/column convention exactly, so results read
   as the same grid system as the rest of the app. */
const PAD = "px-5 md:px-8 lg:px-12";
const GRID = "grid grid-cols-3 sm:grid-cols-6";

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  /* Frozen display order — keeps already-placed cards from reshuffling
     when later pages arrive while a sort is active. */
  const orderRef = useRef<string[]>([]);
  const sigRef = useRef<string>("");

  const urlQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQ);
  const [dq, setDq] = useState(urlQ);

  /* Search mode — driven by the query string. */
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [searchSettled, setSearchSettled] = useState(false);

  /* Browse mode — the default infinite top-rated shelf, shown whenever there's
     no query. Filters drive it server-side via /api/getDiscover. */
  const [browseResults, setBrowseResults] = useState<Item[]>([]);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseHasMore, setBrowseHasMore] = useState(true);
  const [browseSettled, setBrowseSettled] = useState(false);

  const [modalItem, setModalItem] = useState<Item | null>(null);
  /* Bumped to re-render once a freshly-fetched shelf lands in shelfCache. */
  const [, bumpShelf] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    genre: "all",
    year: "all",
    includeAdult: false,
    sortBy: "relevance",
  });

  const hasQuery = dq.trim().length > 0;

  useEffect(() => {
    queueMicrotask(() => {
      setQuery(urlQ);
      setDq(urlQ);
    });
  }, [urlQ]);

  useEffect(() => {
    const t = setTimeout(() => setDq(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const q = dq.trim();
    const next = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    router.replace(next, { scroll: false });
  }, [dq, router]);

  useEffect(() => {
    queueMicrotask(() => {
      setSearchResults([]);
      setSearchPage(1);
      setSearchHasMore(true);
      setSearchSettled(false);
    });
  }, [dq, filters.includeAdult]);

  const fetchSearchMore = useCallback(async () => {
    if (searchLoading || !searchHasMore || !dq.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/getSearch?query=${encodeURIComponent(dq)}&page=${searchPage}&include_adult=${filters.includeAdult}`,
      );
      const json = await res.json();
      const raw: Item[] = json.data?.results ?? [];
      if (!raw.length) {
        setSearchHasMore(false);
        return;
      }
      const items = raw.filter((r) => r.poster_path || r.profile_path);
      setSearchResults((prev) => {
        const seen = new Set(prev.map(itemKey));
        const merged = [...prev];
        for (const r of items) {
          const k = itemKey(r);
          if (seen.has(k)) continue;
          seen.add(k);
          merged.push(r);
        }
        return merged;
      });
      setSearchPage((p) => p + 1);
    } catch {
      setSearchHasMore(false);
    } finally {
      setSearchLoading(false);
      setSearchSettled(true);
    }
  }, [dq, searchPage, searchLoading, searchHasMore, filters.includeAdult]);

  useEffect(() => {
    if (!dq.trim() || searchResults.length > 0 || searchLoading) return;
    const t = setTimeout(() => {
      void fetchSearchMore();
    }, 0);
    return () => clearTimeout(t);
  }, [dq, searchResults.length, searchLoading, fetchSearchMore]);

  /* Browse mode — resets whenever a filter that the discover query depends on
     changes. Genre / year / sort are sent straight to the API; the resulting
     list is already correctly ordered, so unlike search mode it needs no
     client-side re-sort. */
  useEffect(() => {
    queueMicrotask(() => {
      setBrowseResults([]);
      setBrowsePage(1);
      setBrowseHasMore(true);
      setBrowseSettled(false);
    });
  }, [filters.genre, filters.year, filters.sortBy, filters.includeAdult]);

  const fetchBrowseMore = useCallback(async () => {
    if (browseLoading || !browseHasMore) return;
    setBrowseLoading(true);
    try {
      const sort = DISCOVER_SORT[filters.sortBy];
      const yr = DISCOVER_YEAR[filters.year];
      const params = new URLSearchParams({
        type: "movie",
        sort_by: sort.sort_by,
        page: String(browsePage),
      });
      if (sort.voteCountGte) params.set("vote_count_gte", String(sort.voteCountGte));
      if (filters.genre !== "all") params.set("with_genres", filters.genre);
      if (yr.from) params.set("year_from", String(yr.from));
      if (yr.to) params.set("year_to", String(yr.to));
      if (filters.includeAdult) params.set("include_adult", "true");

      const res = await fetch(`/api/getDiscover?${params.toString()}`);
      const json = await res.json();
      const raw: Item[] = json.results ?? [];
      if (!raw.length) {
        setBrowseHasMore(false);
        return;
      }
      const items = raw
        .filter((r) => r.poster_path)
        .map((m) => ({ ...m, media_type: "movie" as const }));
      setBrowseResults((prev) => {
        const seen = new Set(prev.map(itemKey));
        const merged = [...prev];
        for (const r of items) {
          const k = itemKey(r);
          if (seen.has(k)) continue;
          seen.add(k);
          merged.push(r);
        }
        return merged;
      });
      setBrowsePage((p) => p + 1);
    } catch {
      setBrowseHasMore(false);
    } finally {
      setBrowseLoading(false);
      setBrowseSettled(true);
    }
  }, [filters, browsePage, browseLoading, browseHasMore]);

  useEffect(() => {
    if (hasQuery || browseResults.length > 0 || browseLoading) return;
    const t = setTimeout(() => {
      void fetchBrowseMore();
    }, 0);
    return () => clearTimeout(t);
  }, [hasQuery, browseResults.length, browseLoading, fetchBrowseMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        if (hasQuery) {
          if (!searchLoading && searchHasMore && dq.trim()) fetchSearchMore();
        } else if (!browseLoading && browseHasMore) {
          fetchBrowseMore();
        }
      },
      { rootMargin: "1400px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [
    hasQuery,
    dq,
    searchLoading,
    searchHasMore,
    fetchSearchMore,
    browseLoading,
    browseHasMore,
    fetchBrowseMore,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const searchDisplayed = useMemo(() => {
    let items = searchResults;

    if (filters.genre !== "all") {
      const genreId = parseInt(filters.genre, 10);
      items = items.filter((i) => i.genre_ids?.includes(genreId));
    }

    if (filters.year !== "all") {
      items = items.filter((i) => {
        const dateStr = i.release_date || i.first_air_date;
        if (!dateStr) return false;
        const y = parseInt(dateStr.substring(0, 4), 10);
        if (filters.year === "2020s") return y >= 2020;
        if (filters.year === "2010s") return y >= 2010 && y < 2020;
        if (filters.year === "2000s") return y >= 2000 && y < 2010;
        if (filters.year === "1990s") return y >= 1990 && y < 2000;
        if (filters.year === "older") return y < 1990;
        return true;
      });
    }

    const sorted = sortItems(items, filters.sortBy);
    const byKey = new Map(items.map((i) => [itemKey(i), i]));

    /* Signature of the view definition — changes when query / filter / sort
       change, but NOT when more pages load. */
    const sig = [dq, filters.genre, filters.year, filters.sortBy].join("|");

    let order: string[];
    if (sig !== sigRef.current) {
      sigRef.current = sig;
      order = sorted.map(itemKey);
    } else {
      /* Same view, more pages → keep placed cards put, append new ones. */
      const kept = orderRef.current.filter((k) => byKey.has(k));
      const seen = new Set(kept);
      const appended = sorted.map(itemKey).filter((k) => !seen.has(k));
      order = [...kept, ...appended];
    }
    orderRef.current = order;

    return order.map((k) => byKey.get(k)!).filter(Boolean);
  }, [searchResults, dq, filters.genre, filters.year, filters.sortBy]);

  const gridItems = hasQuery ? searchDisplayed : browseResults;
  const loading = hasQuery ? searchLoading : browseLoading;
  const hasMore = hasQuery ? searchHasMore : browseHasMore;
  const settled = hasQuery ? searchSettled : browseSettled;
  const emptyState = hasQuery && gridItems.length === 0 && !loading && settled;
  /* Distinct from `emptyState`: this is filters narrowing the top-rated shelf
     to nothing, not a failed search — a quiet inline note, not HAL's line. */
  const browseEmptyState =
    !hasQuery && gridItems.length === 0 && !loading && settled;

  /* When a search comes up empty, HAL offers a shelf of top-rated films from a
     random genre. Keyed by the failed query: a new not-found search rolls a new
     shelf, but the same query (e.g. after navigating away and back) keeps its
     shelf from shelfCache. setState only runs inside the async callbacks. */
  const shelfKey = dq.trim();
  useEffect(() => {
    if (!emptyState || shelfCache.has(shelfKey)) return;
    let cancelled = false;
    fetchTopRatedShelf(42)
      .then((items) => {
        cacheShelf(shelfKey, items);
        if (!cancelled) bumpShelf((n) => n + 1);
      })
      .catch(() => {
        cacheShelf(shelfKey, []); // cache the miss so skeletons stop
        if (!cancelled) bumpShelf((n) => n + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [emptyState, shelfKey]);

  const cachedShelf = emptyState ? shelfCache.get(shelfKey) : undefined;
  const sciFiLoading = emptyState && cachedShelf === undefined;
  const sciFiItems = cachedShelf ?? [];

  return (
    <div className="min-h-screen bg-[#010101] pt-[66px] text-white">
      {/* ══ Console — query, filters, and HAL. A 60/40 split with the results
          below: the console claims the top 60% of the viewport, HAL scales up
          large enough to bleed past that boundary, and the results section
          (z-10, painted after) covers HAL's lower body where they overlap —
          so HAL reads as standing *behind* the shelf, eye still in full view. ══ */}
      <div className="bg-[#010101] lg:min-h-[50vh]">
        <div
          className={cn(
            PAD,
            "relative z-0 mx-auto flex max-w-[1600px] flex-col lg:min-h-[50vh] lg:flex-row lg:items-stretch",
          )}
        >
          {/* Query + filters */}
          <div className="order-2 flex flex-1 flex-col justify-center py-7 lg:order-1 lg:justify-end lg:py-9 lg:pr-[340px] xl:pr-[400px]">
            <div className="group relative flex w-full max-w-[640px] items-center gap-3 border-b border-white/15 pb-3 transition-colors duration-300 group-focus-within:border-white/35">
              <Search className="h-5 w-5 shrink-0 text-white/30 transition-colors duration-300 group-focus-within:text-white/70 md:h-[22px] md:w-[22px]" />
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies & TV shows"
                aria-label="Search movies and TV shows"
                autoComplete="off"
                spellCheck={false}
                className="h-auto w-full rounded-none border-0 bg-transparent px-0 font-manrope text-xl font-medium text-white shadow-none placeholder:text-white/25 focus-visible:ring-0 md:text-2xl lg:text-[28px]"
              />
            </div>

            {/* Filters — always on; they drive the search results and the
                default top-rated shelf alike. A quiet label opens each row
                so Sort / Year / Rated / Genre read as separate groups at a
                glance, instead of one undifferentiated run of words. */}
            <div className="mt-7 flex max-w-[640px] flex-col gap-3">
              <FilterRow label="Sort">
                {SORTS.filter((s) => hasQuery || s.v !== "relevance").map(
                  (s) => {
                    /* Browse mode has no "Relevance" option — "Top Rated"
                       already means the same thing there, so it carries the
                       active state for the relevance default too. */
                    const active =
                      filters.sortBy === s.v ||
                      (!hasQuery && s.v === "rating" && filters.sortBy === "relevance");
                    return (
                      <FilterOption
                        key={s.v}
                        active={active}
                        onClick={() => setFilters((f) => ({ ...f, sortBy: s.v }))}
                      >
                        {s.label}
                      </FilterOption>
                    );
                  },
                )}
              </FilterRow>

              <FilterRow label="Year">
                {YEAR_STOPS.map((s) => (
                  <FilterOption
                    key={s.v}
                    active={filters.year === s.v}
                    onClick={() => setFilters((f) => ({ ...f, year: s.v }))}
                  >
                    {s.v === "all" ? "Any" : s.label}
                  </FilterOption>
                ))}
              </FilterRow>

              <FilterRow label="Rated">
                <FilterOption
                  tone="danger"
                  active={filters.includeAdult}
                  onClick={() =>
                    setFilters((f) => ({ ...f, includeAdult: !f.includeAdult }))
                  }
                >
                  18+
                </FilterOption>
              </FilterRow>

              {/* Genre — a scroll rail, not a wrap, so the console stays a
                  fixed, compact height. Right edge fades so the cut-off chip
                  reads as "more to scroll," not a layout bug. */}
              <div className="relative flex items-start gap-4 pt-1">
                <span className="w-12 shrink-0 pt-1.5 font-manrope text-[11px] text-white/35">
                  Genre
                </span>
                <div className="relative min-w-0 flex-1">
                  <GenreList
                    value={filters.genre}
                    onChange={(v) => setFilters((f) => ({ ...f, genre: v }))}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-[#010101]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* HAL — compact, mobile/tablet only. Below lg there's no adjacent
              results section to bleed behind, so it stays in normal flow,
              the same sized-wrapper trick as before (a CSS transform doesn't
              shrink an element's layout box, so the wrapper is pre-sized to
              the *scaled* footprint to avoid reserving the unscaled 248×660). */}
          <div className="order-1 flex shrink-0 items-center justify-center py-6 lg:hidden">
            <div className="relative h-[383px] w-[144px] sm:h-[462px] sm:w-[174px]">
              <div className="absolute left-0 top-0 origin-top-left scale-[0.58] sm:scale-[0.7]">
                <Hal9000Panel
                  query={query}
                  filtersStr={JSON.stringify(filters)}
                  isActive={hasQuery}
                  isTalking={emptyState}
                />
              </div>
            </div>
          </div>

          {/* HAL — large, desktop only. Absolutely positioned so it can grow
              past this row's own height and bleed down past the 50% line;
              z-0 keeps it behind the results section (z-10) below, which
              paints over HAL's lower body where the two overlap.
              right-12 matches PAD's lg:px-12, so HAL's right edge lines up
              with the grid's right edge exactly. top-1/2 + a translateY
              tuned to the eye's position within the panel (~53% down) keeps
              the eye centered in this section regardless of viewport height,
              while the panel's height does the rest of the bleeding. */}
          <div className="pointer-events-none absolute right-0 top-1/2 z-0 hidden -translate-y-[53%] lg:right-12 lg:block">
            <div className="pointer-events-auto relative h-[759px] w-[285px] xl:h-[924px] xl:w-[347px]">
              <div className="absolute left-0 top-0 origin-top-left scale-[1.15] xl:scale-[1.4]">
                <Hal9000Panel
                  query={query}
                  filtersStr={JSON.stringify(filters)}
                  isActive={hasQuery}
                  isTalking={emptyState}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Results — the default top-rated shelf, or live search results.
          relative z-10 + opaque background: this is what makes HAL read as
          standing *behind* the shelf rather than just clipped off. ══ */}
      <div className="relative z-10 bg-[#010101] pt-8 pb-28 md:pb-16 lg:min-h-[50vh]">
        <div className={cn(PAD, "mx-auto max-w-[1600px]")}>
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
              <HalEmptyState />
              <SciFiShelf
                items={sciFiItems}
                loading={sciFiLoading}
                onOpen={setModalItem}
              />
            </>
          )}

          {browseEmptyState && (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <p className="font-manrope text-[15px] text-white/55">
                Nothing matches that combination of filters.
              </p>
              <button
                onClick={() =>
                  setFilters({
                    genre: "all",
                    year: "all",
                    includeAdult: filters.includeAdult,
                    sortBy: "relevance",
                  })
                }
                className="font-manrope text-[13px] font-semibold uppercase tracking-[0.08em] text-white underline underline-offset-4 transition-colors hover:text-white/75"
              >
                Clear genre &amp; year
              </button>
            </div>
          )}

          <div ref={sentinelRef} className="flex justify-center py-12">
            {!hasMore && gridItems.length > 0 && (
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-600">
                End of results
              </p>
            )}
          </div>
        </div>
      </div>

      {modalItem && (
        <MovieDetailsModal
          movie={toModalMovie(modalItem)}
          providers={[]}
          onClose={() => setModalItem(null)}
        />
      )}
    </div>
  );
}

/* The Sci-Fi archive HAL offers up when a search finds nothing. Lives inside the
   already-padded results column, so it carries its own (PAD-free) header. */
function SciFiShelf({
  items,
  loading,
  onOpen,
}: {
  items: Item[];
  loading: boolean;
  onOpen: (item: Item) => void;
}) {
  return (
    <div className="mt-4 md:mt-8">
      {/* HAL, offering an alternative in his calm, unbothered way */}

      <div className={GRID}>
        {loading
          ? [...Array(18)].map((_, i) => <SkeletonCard key={i} />)
          : items.map((m, i) => (
              <ResultCard key={m.id} item={m} onOpen={onOpen} index={i} />
            ))}
      </div>
    </div>
  );
}

function ResultCard({
  item,
  onOpen,
  index,
}: {
  item: Item;
  onOpen: (item: Item) => void;
  index: number;
}) {
  const img = item.poster_path ?? item.profile_path;
  const title = item.title ?? item.name ?? "";
  const isPerson = item.media_type === "person";
  const [shown, setShown] = useState(false);

  const revealRef = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px 800px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const body = (
    <div className="relative aspect-[2/3] overflow-hidden bg-neutral-900">
      {img ? (
        shown && (
          <BlurImage
            src={`https://image.tmdb.org/t/p/w342${img}`}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="font-manrope text-[10px] uppercase tracking-[0.2em] text-neutral-700">
            No Image
          </span>
        </div>
      )}

      <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {item.media_type && (
        <span className="absolute left-2.5 top-2.5 z-20 rounded-none bg-black/70 px-2.5 py-1 font-manrope text-[9px] uppercase leading-none tracking-[0.16em] text-white/70 backdrop-blur-md">
          {item.media_type === "tv"
            ? "Series"
            : item.media_type === "person"
              ? "Person"
              : "Movie"}
        </span>
      )}
    </div>
  );

  const cls = cn(
    "group block w-full bg-[#010101] text-left ease-[cubic-bezier(0.16,1,0.3,1)] [transition-property:opacity,transform] [transition-duration:560ms]",
    shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[16px]",
  );
  const style = { transitionDelay: shown ? `${(index % 6) * 25}ms` : "0ms" };

  return isPerson ? (
    <Link
      ref={revealRef}
      href={`/person/${item.id}`}
      className={cls}
      style={style}
    >
      {body}
    </Link>
  ) : (
    <button
      ref={revealRef}
      type="button"
      onClick={() => onOpen(item)}
      className={cn(cls, "cursor-pointer")}
      style={style}
    >
      {body}
    </button>
  );
}

function SkeletonCard() {
  return <div className="aspect-[2/3] animate-pulse bg-white/[0.03]" />;
}

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* The empty-result moment. HAL delivers the line as one full-width row that
   never wraps: it auto-fits to the container, blooms in glyph-by-glyph behind a
   sweeping scan edge, then settles into a slow phosphor breath. Mounts only when
   there is nothing to show, so it always plays from the top. */
function HalEmptyState() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  const chars = useMemo(
    () =>
      HAL_LINE.split("").map((ch, i) => (
        <span
          key={i}
          data-char
          className="inline-block [will-change:transform,filter,opacity]"
        >
          {ch === " " ? " " : ch}
        </span>
      )),
    [],
  );

  // Fit the line to fill the row width on a single line — recomputed on resize.
  useIso(() => {
    const wrap = wrapRef.current;
    const line = lineRef.current;
    if (!wrap || !line) return;
    const fit = () => {
      const avail = wrap.clientWidth;
      if (!avail) return;
      line.style.fontSize = "100px";
      const natural = line.scrollWidth;
      if (natural) line.style.fontSize = `${(avail * 0.62 * 100) / natural}px`;
    };
    let alive = true;
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    // re-measure once the mono webfont swaps in, so the line stays edge-fitted
    document.fonts?.ready.then(() => {
      if (alive) fit();
    });
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, []);

  useIso(() => {
    const line = lineRef.current;
    const cursor = cursorRef.current;
    if (!line || !cursor) return;

    const glyphs = Array.from(
      line.querySelectorAll<HTMLElement>("[data-char]"),
    );

    const placeCursor = (n: number) => {
      const g = n <= 0 ? glyphs[0] : glyphs[n - 1];
      if (!g) return;
      cursor.style.left = `${n <= 0 ? g.offsetLeft : g.offsetLeft + g.offsetWidth}px`;
    };

    gsap.set(glyphs, { opacity: 0, filter: "blur(14px)", y: 8 });
    gsap.set(cursor, { opacity: 1 });
    placeCursor(0);

    if (prefersReducedMotion()) {
      gsap.set(glyphs, { opacity: 1, filter: "blur(0px)", y: 0 });
      placeCursor(glyphs.length);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const charDelay = (ch: string) =>
      ch === "."
        ? 400
        : ch === ","
          ? 220
          : ch === " "
            ? 90
            : 45 + Math.random() * 35;

    let i = 0;
    const type = () => {
      if (cancelled) return;
      if (i >= glyphs.length) {
        gsap.to(cursor, { opacity: 0, duration: 0.2 });
        return;
      }
      gsap.to(glyphs[i], {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      });
      i += 1;
      placeCursor(i);
      timer = setTimeout(type, charDelay(HAL_LINE[i - 1]));
    };

    timer = setTimeout(type, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      gsap.killTweensOf(glyphs);
      gsap.killTweensOf(cursor);
    };
  }, []);

  return (
    <div className="relative overflow-hidden py-24 md:py-36">
      {/* the dark room HAL speaks from — ambient red wash + CRT scanlines */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 50% 48%, rgba(255,20,16,0.12), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.15] mix-blend-overlay"
        style={{
          background:
            "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.75) 51%)",
          backgroundSize: "100% 4px",
        }}
      />

      <div className="relative z-10 px-5 md:px-8 lg:px-12">
        <div ref={wrapRef} className="relative">
          <div
            ref={lineRef}
            className="hal-line-breathe relative whitespace-nowrap text-center font-medium tracking-tighter font-mono text-[#ff2f22]"
            style={{ fontSize: "60px", lineHeight: 1.06 }}
          >
            {chars}
            {/* block cursor — JS parks it at the typing position */}
            <span
              ref={cursorRef}
              aria-hidden
              className="pointer-events-none absolute top-1/2 inline-block h-[0.74em] w-[0.07em] -translate-y-[54%] bg-[#ff2f22] [box-shadow:0_0_12px_rgba(255,30,20,0.95)]"
              style={{ left: 0, opacity: 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

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

/* A plain form-label row: a small dim word naming the group, then its
   options on the same line. Just enough structure to separate Sort from
   Year from Rated at a glance — no boxes, no tracking, no console framing. */
function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <span className="w-12 shrink-0 font-manrope text-[11px] text-white/35">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {children}
      </div>
    </div>
  );
}

/* A filter option, styled exactly like Header's nav links: active = bold
   white, inactive = dim, brightens on hover. No borders, no fills — the
   same plain-text convention used everywhere else in the app. */
function FilterOption({
  active,
  onClick,
  tone = "default",
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "-my-2 py-2 font-manrope text-[13px] transition-colors",
        active
          ? tone === "danger"
            ? "font-semibold text-[#c44539]"
            : "font-semibold text-white"
          : "text-white/45 hover:text-white/75",
      )}
    >
      {children}
    </button>
  );
}

/* ── Cinematic Genre List ── */
function GenreList({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const entries: [string, string][] = [
    ["all", "All"],
    ...Object.entries(GENRES),
  ];
  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto pr-10">
      {entries.map(([id, name]) => {
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={cn(
              "shrink-0 whitespace-nowrap px-3.5 py-2 font-manrope text-[13px] transition-all duration-300",
              active
                ? "bg-white font-semibold text-black"
                : "bg-white/[0.04] text-white/45 hover:bg-white/[0.08] hover:text-white/75",
            )}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
