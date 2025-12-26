"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import MediaCarousel from "../../components/MediaCarousel";
import MediaDetailDialog from "../../components/MediaDetailDialog";
import { SlidersHorizontal, SearchIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const GENRES = {
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
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export default function SearchResults() {
  const { slug } = useParams();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const observerTarget = useRef(null);

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    includeAdult: true,
    mediaType: "all",
    genres: [],
    sortBy: "popularity",
  });

  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (slug) {
      const decodedTerm = decodeURIComponent(slug).replace(/\+/g, " ");
      setSearchTerm(decodedTerm);
      setDebouncedTerm(decodedTerm);
    }
  }, [slug]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 800);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (
      debouncedTerm.trim() &&
      debouncedTerm !== decodeURIComponent(slug || "").replace(/\+/g, " ")
    ) {
      router.replace(`/search/${encodeURIComponent(debouncedTerm)}`);
    }
  }, [debouncedTerm, router, slug]);

  const fetchData = useCallback(async () => {
    if (loading || !hasMore || !slug) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/getSearch?include_adult=${filters.includeAdult}&query=${slug}&page=${page}`
      );
      const fetchedData = await response.json();

      if (!response.ok) {
        throw new Error(fetchedData.message || "Failed to fetch data");
      }

      if (!fetchedData.data.results || fetchedData.data.results.length === 0) {
        setHasMore(false);
        return;
      }

      setData((prevData) => {
        const existingIds = new Set(prevData.map((item) => item.id));
        const newItems = fetchedData.data.results.filter(
          (item) => !existingIds.has(item.id)
        );
        return [...prevData, ...newItems];
      });
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message || "An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  }, [slug, page, loading, hasMore, filters.includeAdult]);

  useEffect(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
  }, [slug, filters.includeAdult]);

  useEffect(() => {
    if (data.length === 0 && !loading) {
      fetchData();
    }
  }, [data.length, loading, fetchData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          fetchData();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [fetchData, loading, hasMore]);

  useEffect(() => {
    let filtered = [...data];

    if (filters.mediaType !== "all") {
      filtered = filtered.filter(
        (item) => item.media_type === filters.mediaType
      );
    }

    if (filters.genres.length > 0) {
      filtered = filtered.filter((item) =>
        item.genre_ids?.some((id) => filters.genres.includes(id))
      );
    }

    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "rating":
          return (b.vote_average || 0) - (a.vote_average || 0);
        case "release_date":
          const dateA = new Date(
            a.release_date || a.first_air_date || 0
          ).getTime();
          const dateB = new Date(
            b.release_date || b.first_air_date || 0
          ).getTime();
          return dateB - dateA;
        case "title":
          return (a.title || a.name || "")
            .toLowerCase()
            .localeCompare((b.title || b.name || "").toLowerCase());
        default:
          return (b.popularity || 0) - (a.popularity || 0);
      }
    });

    setFilteredData(filtered);
  }, [data, filters]);

  const handleOpenDialog = (item) => {
    if (item.media_type === "person") {
      router.push(`/person/${item.id}`);
    } else if (item.media_type === "movie" || item.media_type === "tv") {
      setSelectedItem(item);
      setOpen(true);
    }
  };

  const toggleGenre = (genreId) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genreId)
        ? prev.genres.filter((id) => id !== genreId)
        : [...prev.genres, genreId],
    }));
  };

  const clearFilters = () => {
    setFilters({
      includeAdult: true,
      mediaType: "all",
      genres: [],
      sortBy: "popularity",
    });
  };

  const activeFiltersCount =
    (filters.mediaType !== "all" ? 1 : 0) + filters.genres.length;

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="relative lg:h-80 h-48">
          <img
            src="https://images.unsplash.com/photo-1602306081673-f26c56e0c0c8?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Search"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-[#010101]"></div>
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-transparent to-transparent"></div>

          <div className="absolute inset-0 flex items-end">
            <div className="lg:px-12 px-6 max-w-7xl">
              <h1 className="font-bold text-mdnichrome lg:text-8xl text-5xl tracking-tight drop-shadow-2xl">
                Search Anything..
              </h1>
            </div>
          </div>
        </div>
      </section>

      <div className="lg:px-12 px-6 lg:pb-10 pb-6 mt-6">
        <div className="max-w-screen">
          <div className="ring-2 ring-white/80 rounded-md flex items-center justify-between transition-all">
            <input
              type="text"
              className="bg-transparent border-0 lg:px-6 px-6 py-4 w-full focus:outline-0 focus:ring-0 rounded-md lg:text-xl placeholder:text-white/40"
              placeholder="Search your favourite movies or tv series!"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              className="lg:px-8 px-6 lg:py-7 py-3 bg-green-500 rounded-lg m-1 active:scale-95 transition duration-300 ease-in-out"
            >
              <SearchIcon
                size={24}
                strokeWidth={2.5}
                className="stroke-black/80"
              />
            </button>
          </div>
        </div>
      </div>

      {slug && slug !== "" && (
        <section className="bg-[#010101]/95 backdrop-blur border-b border-white/10">
          <div className="lg:px-12 px-4 py-3 lg:py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-start gap-3 lg:gap-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" />
                <span className="font-bold text-base lg:text-lg">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 lg:gap-3 flex-wrap overflow-x-auto scrollbar-hide">
                <RadioGroup
                  value={filters.mediaType}
                  onValueChange={(value) =>
                    setFilters({ ...filters, mediaType: value })
                  }
                  className="flex items-center gap-2 bg-white/5 rounded-full p-1"
                >
                  {["all", "movie", "tv"].map((type) => (
                    <div key={type} className="flex items-center">
                      <RadioGroupItem
                        value={type}
                        id={`media-${type}`}
                        className="sr-only peer"
                      />
                      <Label
                        htmlFor={`media-${type}`}
                        className={`px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-xs lg:text-sm font-medium cursor-pointer transition-all ${
                          filters.mediaType === type
                            ? "bg-green-500 text-black"
                            : "hover:bg-white/10"
                        }`}
                      >
                        {type === "all"
                          ? "All"
                          : type === "tv"
                          ? "TV"
                          : "Movies"}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <Select
                  value={filters.sortBy}
                  onValueChange={(value) =>
                    setFilters({ ...filters, sortBy: value })
                  }
                >
                  <SelectTrigger className="w-32 lg:w-45 bg-white/10 border-white/20 rounded-full text-xs lg:text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#010101] border-white/20 text-white">
                    <SelectItem value="popularity">Most Popular</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="release_date">Newest First</SelectItem>
                    <SelectItem value="title">A-Z</SelectItem>
                  </SelectContent>
                </Select>

                <label className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full cursor-pointer hover:bg-white/15 transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.includeAdult}
                    onChange={(e) =>
                      setFilters({ ...filters, includeAdult: e.target.checked })
                    }
                    className="w-4 h-4 accent-green-500"
                  />
                  <span className="text-sm font-medium">18+</span>
                </label>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 lg:gap-3">
                <h3 className="font-semibold text-xs lg:text-sm uppercase tracking-wide text-white/70 shrink-0">
                  Genres:
                </h3>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {Object.entries(GENRES)
                    .slice(0, 10)
                    .map(([id, name]) => (
                      <button
                        key={id}
                        onClick={() => toggleGenre(parseInt(id))}
                        className={`px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                          filters.genres.includes(parseInt(id))
                            ? "bg-green-500 text-black"
                            : "bg-white/10 hover:bg-white/15"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!slug || slug === "" ? (
        <section className="lg:px-12 px-6">
          <MediaCarousel
            title="Now Playing"
            apiEndpoint="/api/getMovieList?list=now_playing&page=1"
            linkPrefix="/movie"
            mediaType="movie"
            hideSeeAll={true}
          />
          <MediaCarousel
            title="Popular Movies"
            apiEndpoint="/api/getMovieList?list=popular&page=1"
            linkPrefix="/movie"
            mediaType="movie"
            seeAllLink="/popular"
          />
        </section>
      ) : (
        <>
          <section className="grid grid-cols-12 gap-4 lg:p-10 p-6 min-h-screen">
            {error ? (
              <div className="col-span-12 text-center py-20">
                <h1 className="text-xl font-medium text-red-500">{error}</h1>
              </div>
            ) : filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="relative group lg:col-span-2 col-span-6 cursor-pointer"
                  onClick={() => handleOpenDialog(item)}
                >
                  <div className="relative rounded-lg overflow-hidden bg-white/5 transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-2xl">
                    <img
                      src={
                        item.poster_path
                          ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
                          : item.profile_path
                          ? `https://image.tmdb.org/t/p/w500/${item.profile_path}`
                          : `https://api.dicebear.com/9.x/glass/svg?seed=${
                              item.title || item.name
                            }&backgroundColor=0f172a,111827,1f2933,020617,18181b,0b132b,1a1a2e,121212`
                      }
                      alt={item.title || item.name}
                      className="w-full aspect-2/3 object-cover object-center"
                    />

                    {item.media_type && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold capitalize">
                        {item.media_type === "tv" ? "TV" : item.media_type}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              ))
            ) : !loading ? (
              <div className="col-span-12 text-center py-20">
                <h1 className="text-xl font-medium">No results found</h1>
                <p className="text-sm opacity-70 mt-2">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : null}

            {loading &&
              [...Array(12)].map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="lg:col-span-2 col-span-6 animate-pulse"
                >
                  <div className="relative rounded-lg bg-white/5 aspect-2/3 overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-white/10 via-white/5 to-transparent"></div>
                  </div>
                </div>
              ))}
          </section>

          <div ref={observerTarget} className="flex justify-center py-12">
            {!hasMore && filteredData.length > 0 && (
              <div className="px-8 py-3 bg-white/5 backdrop-blur rounded-full text-sm text-neutral-400 border border-white/10">
                No more results
              </div>
            )}
          </div>
        </>
      )}
      <MediaDetailDialog
        open={open}
        onOpenChange={setOpen}
        item={selectedItem}
        mediaType={selectedItem?.media_type}
        linkPrefix={selectedItem?.media_type === "tv" ? "/tv" : "/movie"}
      />
    </>
  );
}
