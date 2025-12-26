"use client";

import { Play, LayoutGrid, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * MediaGrid - Reusable component for displaying media content with infinite scroll
 * @param {string} title - Page title
 * @param {string} subtitle - Optional subtitle
 * @param {string} apiEndpoint - API endpoint to fetch data
 * @param {string} linkPrefix - URL prefix for links (/movie or /tv)
 * @param {string} emptyMessage - Message when no more content
 * @param {string} heroImage - Hero section background image URL
 */
export default function MediaGrid({
  title,
  subtitle,
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

  // Dialog states
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [credits, setCredits] = useState(null);
  const [logo, setLogo] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const fetchData = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiEndpoint}&page=${page}`);
      const fetchedData = await response.json();

      if (!fetchedData.data.results || fetchedData.data.results.length === 0) {
        setHasMore(false);
        return;
      }

      setData((prevData) => [...prevData, ...fetchedData.data.results]);
      setPage((prevPage) => prevPage + 1);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, []);

  // Infinite scroll observer
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
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchData, loading, hasMore]);

  // Fetch movie details when dialog opens
  useEffect(() => {
    async function fetchDetails() {
      if (selectedItem) {
        try {
          // Determine if this is TV content based on linkPrefix
          const isTV = linkPrefix === "/tv";

          // Use dedicated TV APIs or movie APIs based on content type
          const trailerEndpoint = isTV
            ? `/api/getTVTrailer?id=${selectedItem.id}`
            : `/api/getTrailer?id=${selectedItem.id}`;
          const creditsEndpoint = isTV
            ? `/api/getTVCredits?id=${selectedItem.id}`
            : `/api/getCredits?id=${selectedItem.id}`;
          const imagesEndpoint = isTV
            ? `/api/getTVImages?id=${selectedItem.id}`
            : `/api/getMovieImages?id=${selectedItem.id}`;

          // Fetch trailer
          const trailerResponse = await fetch(trailerEndpoint);
          const trailerData = await trailerResponse.json();
          setTrailer(trailerData.key);

          // Fetch credits
          const creditsResponse = await fetch(creditsEndpoint);
          const creditsData = await creditsResponse.json();
          setCredits(creditsData);

          // Fetch logo
          const logoResponse = await fetch(imagesEndpoint);
          const logoData = await logoResponse.json();
          const englishLogo = logoData.data.logos?.find(
            (logo) => logo.iso_639_1 === "en"
          );
          setLogo(englishLogo?.file_path);

          // Fetch enhanced details for runtime, production info
          const detailsEndpoint = isTV
            ? `/api/getTVDetailsEnhanced?id=${selectedItem.id}`
            : `/api/getMovieDetailsEnhanced?id=${selectedItem.id}`;
          try {
            const detailsResponse = await fetch(detailsEndpoint);
            const detailsData = await detailsResponse.json();
            setItemDetails(detailsData.data);
          } catch (e) {
            console.error("Error fetching details:", e);
          }
        } catch (error) {
          console.error("Error fetching details:", error);
        }
      }
    }

    if (open && selectedItem) {
      fetchDetails();
    }
  }, [open, selectedItem, linkPrefix]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Start trailer after 3 seconds and set HD quality
  useEffect(() => {
    if (open) {
      setShowTrailer(false);
      setIsMuted(true);
      const timer = setTimeout(() => {
        setShowTrailer(true);

        // Set HD quality when player is ready
        const checkPlayer = setInterval(() => {
          const iframe = document.getElementById("grid-trailer-player");
          if (iframe && window.YT && window.YT.Player) {
            try {
              const player = new window.YT.Player(iframe);
              player.setPlaybackQuality("hd1080");
              clearInterval(checkPlayer);
            } catch (e) {
              // Player not ready yet
            }
          }
        }, 500);

        setTimeout(() => clearInterval(checkPlayer), 10000);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowTrailer(false);
      setTrailer(null);
      setCredits(null);
      setLogo(null);
    }
  }, [open]);

  const handleOpenDialog = (item) => {
    setSelectedItem(item);
    setOpen(true);
  };

  const handleMuteToggle = () => {
    const iframe = document.querySelector('iframe[src*="youtube"]');
    if (iframe && iframe.contentWindow) {
      const command = isMuted
        ? '{"event":"command","func":"unMute","args":""}'
        : '{"event":"command","func":"mute","args":""}';
      iframe.contentWindow.postMessage(command, "*");
      setIsMuted(!isMuted);
    }
  };

  const genresById = {
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

  const getGenres = (genreIds) => {
    return genreIds?.map((id) => ({ id, name: genresById[id] })) || [];
  };

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="relative lg:h-80 h-48">
          <img
            src={heroImage}
            alt={title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-[#010101]"></div>
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-transparent to-transparent"></div>
          <div className="absolute inset-0 top-0 flex items-end">
            <div className="lg:px-12 px-6 max-w-7xl">
              <h1 className="font-bold text-mdnichrome lg:text-8xl text-5xl tracking-tight drop-shadow-2xl">
                {title}
              </h1>
            </div>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-12 gap-4 lg:p-10 p-6">
        {data.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="relative group lg:col-span-2 col-span-6 shrink-0 snap-start cursor-pointer"
            onClick={() => handleOpenDialog(item)}
          >
            <div className="relative rounded-lg overflow-hidden bg-white/5 transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-white/10">
              <img
                src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                alt={item.title || item.name}
                className="w-full aspect-2/3 object-cover object-center"
              />

              <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        ))}

        {loading &&
          [...Array(6)].map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="lg:col-span-2 col-span-6 animate-pulse"
            >
              <div className="relative rounded-lg bg-white/5 aspect-2/3 overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-white/10 via-white/5 to-transparent"></div>
                <div className="absolute inset-0 bg-linear-to-t from-white/5 to-transparent animate-pulse"></div>
              </div>
            </div>
          ))}
      </section>

      <div ref={observerTarget} className="flex justify-center py-12">
        {!hasMore && data.length > 0 && (
          <div className="px-8 py-3 bg-white/5 backdrop-blur rounded-full text-sm text-neutral-400 border border-white/10">
            {emptyMessage}
          </div>
        )}
      </div>

      {selectedItem && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="lg:max-w-6xl max-lg:max-w-none p-0 border-none bg-[#010101] overflow-hidden">
            <DialogTitle className="sr-only">
              {selectedItem.title || selectedItem.name} - Details
            </DialogTitle>
            <div className="max-h-[90vh] overflow-y-auto overscroll-contain">
              <div className="relative h-56 lg:h-[500px]">
                {showTrailer && trailer ? (
                  <div className="absolute inset-0 overflow-hidden">
                    <iframe
                      id="grid-trailer-player"
                      src={`https://www.youtube.com/embed/${trailer}?autoplay=1&mute=1&loop=1&playlist=${trailer}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&cc_load_policy=0&autohide=1&enablejsapi=1`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; encrypted-media"
                      style={{
                        border: "none",
                        pointerEvents: "none",
                        transform: "scale(1.4)",
                        objectFit: "cover",
                      }}
                    ></iframe>
                  </div>
                ) : (
                  <img
                    src={`https://image.tmdb.org/t/p/original/${selectedItem.backdrop_path}`}
                    alt="Backdrop"
                    className="w-full h-full object-cover object-top"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-[#010101] from-1% to-transparent"></div>

                <div className="hidden lg:block absolute bottom-6 left-6 right-6 z-10 space-y-4">
                  {logo && (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${logo}`}
                      alt={selectedItem.title || selectedItem.name}
                      className="max-w-md max-h-24 object-contain"
                    />
                  )}
                  <Link
                    href={`${linkPrefix}/${selectedItem.id}`}
                    className="inline-flex gap-2 items-center px-8 py-3 bg-white text-black rounded font-semibold hover:bg-white/90"
                  >
                    <Play className="w-5 h-5 fill-black" />
                    <span>Watch Now</span>
                  </Link>
                </div>

                {/* Mute Button */}
                {showTrailer && trailer && (
                  <button
                    onClick={handleMuteToggle}
                    className="absolute bottom-4 right-4 z-20 p-3 rounded-full border-2 border-white/60 hover:border-white bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>

              {/* Mobile: Logo and Watch Button below backdrop */}
              <div className="lg:hidden px-4 py-4 space-y-3 bg-[#010101]">
                {logo && (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${logo}`}
                    alt={selectedItem.title || selectedItem.name}
                    className="max-w-50 max-h-16 object-contain"
                  />
                )}
                <Link
                  href={`${linkPrefix}/${selectedItem.id}`}
                  className="inline-flex gap-2 items-center px-6 py-2.5 bg-white text-black rounded font-semibold hover:bg-white/90 text-sm"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Watch Now</span>
                </Link>
              </div>

              {/* Content - 2 Column Layout */}
              <div className="relative lg:p-8 p-4">
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Left Column - Info */}
                  <div className="lg:col-span-2 space-y-5">
                    {/* Rating, Year, Runtime */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-green-500 font-semibold">
                        {Math.floor(selectedItem.vote_average * 10)}% Match
                      </span>
                      <span className="opacity-80">
                        {(
                          selectedItem.release_date ||
                          selectedItem.first_air_date
                        )?.slice(0, 4)}
                      </span>
                      {itemDetails?.runtime && (
                        <span className="opacity-80 border border-white/20 px-2 py-0.5 rounded text-xs">
                          {Math.floor(itemDetails.runtime / 60)}h{" "}
                          {itemDetails.runtime % 60}m
                        </span>
                      )}
                      {itemDetails?.number_of_seasons && (
                        <span className="opacity-80 border border-white/20 px-2 py-0.5 rounded text-xs">
                          {itemDetails.number_of_seasons}{" "}
                          {itemDetails.number_of_seasons > 1
                            ? "Seasons"
                            : "Season"}
                        </span>
                      )}
                      <span className="opacity-60 text-xs">
                        ⭐ {selectedItem.vote_average?.toFixed(1)} (
                        {selectedItem.vote_count?.toLocaleString()} votes)
                      </span>
                    </div>

                    {/* Overview */}
                    <p className="text-sm lg:text-base leading-relaxed opacity-90">
                      {selectedItem.overview}
                    </p>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2">
                      {getGenres(selectedItem.genre_ids).map((genre) => (
                        <Link
                          key={genre.id}
                          href={`/genre/${genre.id}`}
                          onClick={() => setOpen(false)}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-full text-xs lg:text-sm font-medium"
                        >
                          {genre.name}
                        </Link>
                      ))}
                    </div>

                    {/* Director & Production */}
                    <div className="space-y-2 text-sm opacity-80">
                      {credits?.data?.crew?.find(
                        (c) => c.job === "Director"
                      ) && (
                        <p>
                          <span className="opacity-60">Director: </span>
                          <Link
                            href={`/person/${
                              credits.data.crew.find(
                                (c) => c.job === "Director"
                              ).id
                            }`}
                            onClick={() => setOpen(false)}
                            className="hover:underline"
                          >
                            {
                              credits.data.crew.find(
                                (c) => c.job === "Director"
                              ).name
                            }
                          </Link>
                        </p>
                      )}
                      {itemDetails?.created_by?.length > 0 && (
                        <p>
                          <span className="opacity-60">Created by: </span>
                          {itemDetails.created_by
                            .slice(0, 2)
                            .map((c) => c.name)
                            .join(", ")}
                        </p>
                      )}
                      {itemDetails?.production_companies?.length > 0 && (
                        <p>
                          <span className="opacity-60">Studio: </span>
                          {itemDetails.production_companies
                            .slice(0, 2)
                            .map((c) => c.name)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Cast */}
                  <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold">Top Cast</h3>
                    <div
                      className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide"
                      style={{ overscrollBehavior: "contain" }}
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {credits?.data?.cast?.slice(0, 8).map((actor) => (
                        <Link
                          key={actor.id}
                          href={`/person/${actor.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 group"
                        >
                          <div className="relative rounded-full overflow-hidden w-10 h-10 shrink-0 bg-white/10">
                            {actor.profile_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                                alt={actor.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5">
                                <span className="text-sm opacity-50">👤</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate group-hover:text-white/80">
                              {actor.name}
                            </p>
                            <p className="text-xs opacity-60 truncate">
                              {actor.character}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
