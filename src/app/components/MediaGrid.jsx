"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Star, RotateCcw, Filter, SlidersHorizontal, X } from "lucide-react";
import MediaDetailDialog from "./MediaDetailDialog";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── Constants ─────────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1960;

const MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
];

const TV_GENRES = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 9648, name: "Mystery" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10762, name: "Kids" },
  { id: 37, name: "Western" },
];

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "popularity", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "release_date", label: "Newest First" },
  { value: "title", label: "A – Z" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "hi", label: "Hindi" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "zh", label: "Chinese" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getItemTitle(item) {
  return item?.title || item?.name || "";
}

function getItemDate(item) {
  return item?.release_date || item?.first_air_date || "";
}

function getItemYear(item) {
  const date = getItemDate(item);
  return date ? parseInt(date.split("-")[0], 10) : null;
}

function applyFilters(
  items,
  { genres, sortBy, yearFrom, yearTo, language, minRating },
) {
  let result = [...items];

  if (genres.length > 0) {
    result = result.filter((item) =>
      item.genre_ids?.some((id) => genres.includes(id)),
    );
  }

  if (yearFrom > MIN_YEAR || yearTo < CURRENT_YEAR) {
    result = result.filter((item) => {
      const year = getItemYear(item);
      if (!year) return false;
      return year >= yearFrom && year <= yearTo;
    });
  }

  if (language) {
    result = result.filter((item) => item.original_language === language);
  }

  if (minRating > 0) {
    result = result.filter((item) => (item.vote_average || 0) >= minRating);
  }

  if (sortBy !== "default") {
    result.sort((a, b) => {
      switch (sortBy) {
        case "popularity":
          return (b.popularity || 0) - (a.popularity || 0);
        case "rating":
          return (b.vote_average || 0) - (a.vote_average || 0);
        case "release_date":
          return (
            new Date(getItemDate(b) || 0).getTime() -
            new Date(getItemDate(a) || 0).getTime()
          );
        case "title":
          return getItemTitle(a)
            .toLowerCase()
            .localeCompare(getItemTitle(b).toLowerCase());
        default:
          return 0;
      }
    });
  }

  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MediaGrid({
  title,
  apiEndpoint,
  linkPrefix,
  emptyMessage = "No more content",
  heroImage,
}) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filter state
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [sortBy, setSortBy] = useState("default");
  const [yearFrom, setYearFrom] = useState(MIN_YEAR);
  const [yearTo, setYearTo] = useState(CURRENT_YEAR);
  const [language, setLanguage] = useState(null);
  const [minRating, setMinRating] = useState(0);

  const isTV = linkPrefix === "/tv";
  const genres = isTV ? TV_GENRES : MOVIE_GENRES;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const sep = apiEndpoint.includes("?") ? "&" : "?";
      const response = await fetch(`${apiEndpoint}${sep}page=${page}`);
      const json = await response.json();
      if (!json.data?.results?.length) {
        setHasMore(false);
        return;
      }
      setData((prev) => {
        const ids = new Set(prev.map((i) => i.id));
        return [...prev, ...json.data.results.filter((i) => !ids.has(i.id))];
      });
      setPage((p) => p + 1);
    } catch (err) {
      console.error("MediaGrid fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, apiEndpoint]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) fetchData();
      },
      { threshold: 0.1 },
    );
    const el = observerTarget.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [fetchData, loading, hasMore]);

  useEffect(() => {
    if (showAdvanced) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showAdvanced]);

  // ── Derived list ──────────────────────────────────────────────────────────
  const displayData = useMemo(
    () =>
      applyFilters(data, {
        genres: selectedGenres,
        sortBy,
        yearFrom,
        yearTo,
        language,
        minRating,
      }),
    [data, selectedGenres, sortBy, yearFrom, yearTo, language, minRating],
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleGenre = (id) =>
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );

  const toggleLanguage = (code) =>
    setLanguage((prev) => (prev === code ? null : code));

  const clearFilters = () => {
    setSelectedGenres([]);
    setSortBy("default");
    setYearFrom(MIN_YEAR);
    setYearTo(CURRENT_YEAR);
    setLanguage(null);
    setMinRating(0);
  };

  const clearAdvancedFilters = () => {
    setYearFrom(MIN_YEAR);
    setYearTo(CURRENT_YEAR);
    setLanguage(null);
    setMinRating(0);
  };

  const yearActive = yearFrom > MIN_YEAR || yearTo < CURRENT_YEAR;
  const advancedCount =
    (yearActive ? 1 : 0) + (language ? 1 : 0) + (minRating > 0 ? 1 : 0);
  const activeCount =
    selectedGenres.length + (sortBy !== "default" ? 1 : 0) + advancedCount;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="relative lg:h-72 h-40">
          <img
            src={heroImage || "/hero-bg.jpg"}
            alt="Hero"
            className="w-full h-full object-cover object-center"
            style={{ animation: "kenburns 30s ease-in-out infinite alternate" }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        </div>
      </section>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <section className="sticky top-16 z-40 shadow-xl shadow-black/50">
        <div className="bg-[#0a0a0a] relative z-20 pb-4 pt-6">
          <div className="lg:px-12 px-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4 sm:gap-0">
            <h1 className="text-2xl lg:text-4xl font-black tracking-tighter text-white drop-shadow-md">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Filter Button Dropdown */}
              <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
                <PopoverTrigger asChild>
                  <button
                    className={`flex items-center gap-2 px-4 h-10 sm:h-9 rounded-sm text-sm font-semibold transition-all duration-300 ${
                      showAdvanced || advancedCount > 0
                        ? "bg-[#22c55e] text-black border-[#22c55e]"
                        : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] hover:border-white/20"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                    {advancedCount > 0 && (
                      <span
                        className={`flex items-center justify-center w-5 h-5 rounded-sm text-[10px] font-bold ml-1 ${showAdvanced || advancedCount > 0 ? "bg-black text-[#22c55e]" : "bg-[#22c55e] text-black"}`}
                      >
                        {advancedCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[95vw] sm:w-[600px] lg:w-[800px] p-0 bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-sm flex flex-col mt-2"
                  align="start"
                  sideOffset={8}
                  collisionPadding={16}
                  style={{
                    maxHeight: "var(--radix-popover-content-available-height)",
                  }}
                >
                  <div className="p-5 sm:p-6 lg:p-8 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
                      {/* Left side: Genres (takes up 2 columns) */}
                      <div className="lg:col-span-2 space-y-4 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-8">
                        <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                          Genres
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedGenres([])}
                            className={`text-sm px-4 py-2 rounded-sm transition-colors ${
                              selectedGenres.length === 0
                                ? "bg-[#22c55e] text-black font-medium"
                                : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
                            }`}
                          >
                            All
                          </button>
                          {genres.map(({ id, name }) => {
                            const active = selectedGenres.includes(id);
                            return (
                              <button
                                key={id}
                                onClick={() => toggleGenre(id)}
                                className={`text-sm px-4 py-2 rounded-sm transition-colors ${
                                  active
                                    ? "bg-[#22c55e] text-black font-medium"
                                    : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
                                }`}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right side: Other Filters */}
                      <div className="lg:col-span-2 space-y-8">
                        {/* Year Filter */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                              Release Year
                            </h4>
                            <span className="text-sm font-medium text-[#22c55e]">
                              {yearFrom} — {yearTo}
                            </span>
                          </div>
                          <Slider
                            min={MIN_YEAR}
                            max={CURRENT_YEAR}
                            step={1}
                            value={[yearFrom, yearTo]}
                            onValueChange={([from, to]) => {
                              setYearFrom(from);
                              setYearTo(to);
                            }}
                            className="cursor-pointer"
                          />
                        </div>

                        {/* Rating Filter */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                              Minimum Rating
                            </h4>
                            {minRating > 0 ? (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#22c55e]">
                                <Star className="w-4 h-4 fill-current text-[#22c55e]" />
                                {minRating} +
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-white/50">
                                Any
                              </span>
                            )}
                          </div>
                          <Slider
                            min={0}
                            max={9}
                            step={0.5}
                            value={[minRating]}
                            onValueChange={([v]) => setMinRating(v)}
                            className="cursor-pointer"
                          />
                        </div>

                        {/* Language Filter */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                            Original Language
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {LANGUAGES.map(({ code, label }) => {
                              const active = language === code;
                              return (
                                <button
                                  key={code}
                                  onClick={() => toggleLanguage(code)}
                                  className={`text-sm px-4 py-2 rounded-sm transition-colors ${
                                    active
                                      ? "bg-[#22c55e] text-black font-medium"
                                      : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel Footer / Actions */}
                  <div className="px-5 py-4 sm:px-6 sm:py-5 border-t border-white/10 flex items-center justify-between gap-2 bg-[#0a0a0a] shrink-0 rounded-b-sm">
                    <div className="text-xs sm:text-sm font-medium text-white/50">
                      <span className="text-[#22c55e] text-base sm:text-lg font-bold">
                        {displayData.length}
                      </span>{" "}
                      matches
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      {activeCount > 0 && (
                        <button
                          onClick={clearFilters}
                          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors px-2 sm:px-4 py-2"
                        >
                          <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">
                            Reset Filters
                          </span>
                          <span className="sm:hidden">Reset</span>
                        </button>
                      )}
                      <button
                        onClick={() => setShowAdvanced(false)}
                        className="px-6 sm:px-8 py-2 bg-[#22c55e] text-black text-xs sm:text-sm font-bold rounded-sm hover:bg-[#22c55e]/90 transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px] sm:w-[140px] h-10 sm:h-9 bg-[#2a2a2a] border-0 text-white rounded-sm focus:ring-0 hover:bg-[#3a3a3a] transition-colors shadow-none">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] rounded-sm shadow-2xl border-0">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-sm font-medium text-white/70 focus:bg-[#2a2a2a] focus:text-white rounded-sm cursor-pointer"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Grid ─────────────────────────────────────────────────── */}
      <div className="lg:px-12 px-6 py-10">
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayData.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              onClick={() => {
                setSelectedItem(item);
                setOpen(true);
              }}
              className="cursor-pointer group relative"
            >
              <div className="relative aspect-2/3 bg-white/5 rounded overflow-hidden transition-all duration-500 shadow-2xl">
                <img
                  src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                  alt={getItemTitle(item)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
              </div>
            </div>
          ))}

          {!loading && displayData.length === 0 && data.length > 0 && (
            <div className="col-span-full py-32 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-6">
                <Filter className="w-8 h-8 text-white/10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No matches found
              </h3>
              <p className="text-white/40 text-sm max-w-xs mx-auto mb-8">
                We couldn't find any titles matching your current filter
                selection.
              </p>
              <button
                onClick={clearFilters}
                className="px-8 py-3 bg-white text-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {loading &&
            [...Array(12)].map((_, i) => (
              <div key={`sk-${i}`} className="animate-pulse">
                <div className="relative aspect-2/3 bg-white/5 rounded-xl overflow-hidden" />
              </div>
            ))}
        </section>

        {/* ── Infinite scroll trigger ──────────────────────────────────────── */}
        <div ref={observerTarget} className="flex justify-center py-20">
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
            </div>
          )}
          {!hasMore && data.length > 0 && (
            <div className="px-10 py-4 bg-white/5 backdrop-blur-xl rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 border border-white/5">
              {emptyMessage}
            </div>
          )}
        </div>

        <MediaDetailDialog
          open={open}
          onOpenChange={setOpen}
          item={selectedItem}
          mediaType={isTV ? "tv" : "movie"}
          linkPrefix={linkPrefix}
        />
      </div>
    </div>
  );
}
