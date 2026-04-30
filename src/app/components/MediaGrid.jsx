"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Star, RotateCcw } from "lucide-react";
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
    <div className="min-h-screen bg-[#010101]">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="relative lg:h-72 h-56">
          <img
            src={heroImage || "/hero-bg.jpg"}
            alt="Hero"
            className="w-full h-full object-cover object-center"
            style={{ animation: "kenburns 30s ease-in-out infinite alternate" }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-r from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 lg:px-12 px-6 pb-7">
            <h1 className="lg:text-5xl text-3xl font-black tracking-tighter text-white">
              {title}
            </h1>
          </div>
        </div>
      </section>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <section className="sticky top-16 z-40 bg-[#010101]/90 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="lg:px-12 px-4">
          {/* Row 1: Genre pills */}
          <div className="relative">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3 pr-10">
              {genres.map(({ id, name }) => {
                const active = selectedGenres.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleGenre(id)}
                    className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200 ${
                      active
                        ? "bg-white text-black"
                        : "bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-linear-to-l from-[#010101] to-transparent" />
          </div>

          {/* Row 2: Controls */}
          <div className="flex items-center gap-4 py-3 border-t border-white/[0.05] flex-wrap lg:flex-nowrap">
            {/* Year */}
            <div className="flex items-center gap-3 min-w-0 flex-1 lg:max-w-[240px]">
              <span className="shrink-0 text-xs font-semibold text-white/40 w-8">
                Year
              </span>
              <div className="flex-1">
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
              <Badge
                variant="outline"
                className="shrink-0 text-xs font-semibold tabular-nums text-white/60 border-white/10 bg-white/5"
              >
                {yearFrom}–{yearTo}
              </Badge>
            </div>

            <Separator
              orientation="vertical"
              className="h-5 bg-white/[0.08] hidden lg:block"
            />

            {/* Rating */}
            <div className="flex items-center gap-3 min-w-0 flex-1 lg:max-w-[200px]">
              <span className="shrink-0 text-xs font-semibold text-white/40 w-12">
                Rating
              </span>
              <div className="flex-1">
                <Slider
                  min={0}
                  max={9}
                  step={0.5}
                  value={[minRating]}
                  onValueChange={([v]) => setMinRating(v)}
                  className="cursor-pointer"
                />
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-xs font-semibold tabular-nums border-white/10 ${
                  minRating > 0
                    ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                    : "text-white/40 bg-white/5"
                }`}
              >
                {minRating > 0 ? `${minRating}+` : "Any"}
              </Badge>
            </div>

            <Separator
              orientation="vertical"
              className="h-5 bg-white/[0.08] hidden lg:block"
            />

            {/* Language */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <span className="shrink-0 text-xs font-semibold text-white/40">
                Language
              </span>
              {LANGUAGES.map(({ code, label }) => {
                const active = language === code;
                return (
                  <button
                    key={code}
                    onClick={() => toggleLanguage(code)}
                    className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full transition-all duration-150 ${
                      active
                        ? "bg-white text-black"
                        : "bg-white/[0.06] text-white/40 hover:bg-white/[0.1] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <Separator
              orientation="vertical"
              className="h-5 bg-white/[0.08] hidden lg:block"
            />

            {/* Sort + Reset + Count */}
            <div className="flex items-center gap-3 ml-auto shrink-0">
              {activeCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white/30 hover:text-red-400 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
              <Badge
                variant="outline"
                className="text-xs font-semibold text-white/40 border-white/10 bg-white/5 hidden sm:flex"
              >
                {displayData.length} titles
              </Badge>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 h-8 text-xs font-semibold bg-white/[0.05] border-white/[0.1] text-white/60 hover:text-white focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs font-semibold text-white/70 focus:bg-white/10 focus:text-white"
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
        {activeCount > 0 && (
          <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-sm font-semibold text-white/40">
              Showing <span className="text-white">{displayData.length}</span>{" "}
              results matching your criteria
            </h2>
          </div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {displayData.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              onClick={() => {
                setSelectedItem(item);
                setOpen(true);
              }}
              className="cursor-pointer group relative"
            >
              <div className="relative aspect-2/3 bg-white/5 rounded-xl overflow-hidden ring-1 ring-white/5 group-hover:ring-white/20 transition-all duration-500 shadow-2xl">
                <img
                  src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                  alt={getItemTitle(item)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Quick Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-white/90 truncate max-w-[70%]">
                      {getItemTitle(item)}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-500">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {item.vote_average?.toFixed(1)}
                    </div>
                  </div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">
                    {getItemYear(item)}
                  </p>
                </div>
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
