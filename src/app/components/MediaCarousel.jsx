"use client";

import { ArrowRight, Play, LayoutGrid, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function MediaCarousel({
  title,
  apiEndpoint,
  linkPrefix,
  mediaType = "movie",
  seeAllLink,
  hideSeeAll = false,
}) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [credits, setCredits] = useState(null);
  const [logo, setLogo] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const isTV = mediaType === "tv";

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(apiEndpoint);
        const fetchedData = await response.json();
        setData(fetchedData.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, [apiEndpoint]);

  // Fetch details when dialog opens
  useEffect(() => {
    async function fetchDetails() {
      if (selectedItem) {
        try {
          // Use dedicated TV APIs or movie APIs based on mediaType
          const trailerEndpoint = isTV
            ? `/api/getTVTrailer?id=${selectedItem.id}`
            : `/api/getTrailer?id=${selectedItem.id}`;
          const creditsEndpoint = isTV
            ? `/api/getTVCredits?id=${selectedItem.id}`
            : `/api/getCredits?id=${selectedItem.id}`;
          const imagesEndpoint = isTV
            ? `/api/getTVImages?id=${selectedItem.id}`
            : `/api/getMovieImages?id=${selectedItem.id}`;

          const trailerResponse = await fetch(trailerEndpoint);
          const trailerData = await trailerResponse.json();
          setTrailer(trailerData.key);

          const creditsResponse = await fetch(creditsEndpoint);
          const creditsData = await creditsResponse.json();
          setCredits(creditsData);

          const logoResponse = await fetch(imagesEndpoint);
          const logoData = await logoResponse.json();
          const englishLogo = logoData.data?.logos?.find(
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
    } else if (!open) {
      setItemDetails(null);
    }
  }, [open, selectedItem, isTV]);

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
          const iframe = document.getElementById("carousel-trailer-player");
          if (iframe && window.YT && window.YT.Player) {
            try {
              const player = new window.YT.Player(iframe);
              player.setPlaybackQuality("hd1080");
              clearInterval(checkPlayer);
            } catch (e) {
              // Player not ready yet, will retry
            }
          }
        }, 500);

        setTimeout(() => clearInterval(checkPlayer), 10000); // Stop trying after 10s
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

  // Genre mappings
  const movieGenres = {
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

  const tvGenres = {
    10759: "Action & Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    10762: "Kids",
    9648: "Mystery",
    10763: "News",
    10764: "Reality",
    10765: "Sci-Fi & Fantasy",
    10766: "Soap",
    10767: "Talk",
    10768: "War & Politics",
    37: "Western",
  };

  const getGenres = (genreIds) => {
    const genreMap = isTV ? tvGenres : movieGenres;
    return genreIds?.map((id) => ({ id, name: genreMap[id] })) || [];
  };

  const getTitle = (item) => (isTV ? item.name : item.title);
  const getDate = (item) => (isTV ? item.first_air_date : item.release_date);

  return (
    <>
      {data ? (
        <section className="relative">
          <div className="lg:px-10 px-6 pt-10 flex items-center justify-between">
            <h1 className="lg:text-2xl text-mdnichrome text-lg text-white/90 font-semibold">
              {title}
            </h1>
          </div>
          <div className="lg:px-10 px-6">
            <div className="flex items-center gap-4 overflow-x-auto py-3 pb-10 ps-1 snap-x">
              {data.results.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => handleOpenDialog(item)}
                  className="relative group shrink-0 lg:w-72 w-56 snap-start h-full cursor-pointer"
                >
                  <div className="relative rounded-lg overflow-hidden bg-white/5 transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-white/10">
                    <img
                      src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                      alt={getTitle(item)}
                      className="w-full aspect-2/3 object-cover object-center rounded-lg"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black via-black/10 to-transparent opacity-60 group-hover:opacity-100 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="relative">
          <div className="lg:px-10 px-6 pt-10">
            <div className="h-6 w-40 bg-white/5 rounded animate-pulse"></div>
          </div>
          <div className="lg:px-10 px-6">
            <div className="flex items-center gap-4 py-3 pb-10">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="shrink-0 lg:w-64 w-48 lg:h-96 h-72 bg-white/5 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {selectedItem && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="lg:max-w-6xl max-lg:max-w-none p-0 border-none bg-[#010101] overflow-hidden">
            <DialogTitle className="sr-only">
              {getTitle(selectedItem)} - Details
            </DialogTitle>
            <div className="max-h-[95vh] overflow-y-auto overscroll-contain">
              <div className="relative h-56 lg:h-125">
                {showTrailer && trailer ? (
                  <div className="absolute inset-0 overflow-hidden">
                    <iframe
                      id="carousel-trailer-player"
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
                <div className="absolute inset-0 bg-linear-to-t from-[#010101] from-5% to-transparent"></div>

                <div className="hidden lg:block absolute bottom-6 left-6 right-6 z-10 space-y-4">
                  {logo && (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${logo}`}
                      alt={getTitle(selectedItem)}
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

                {showTrailer && trailer && (
                  <button
                    onClick={handleMuteToggle}
                    className="absolute bottom-4 right-4 z-20 p-3 rounded-full border-2 border-white/60 hover:border-white bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>

              <div className="lg:hidden px-4 py-4 space-y-3 bg-[#010101]">
                {logo && (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${logo}`}
                    alt={getTitle(selectedItem)}
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

              <div className="relative lg:p-8 p-4">
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-5">
                    {/* Rating, Year, Runtime */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-green-500 font-semibold">
                        {Math.floor(selectedItem.vote_average * 10)}% Match
                      </span>
                      <span className="opacity-80">
                        {getDate(selectedItem)?.slice(0, 4)}
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

                  <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold">Top Cast</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
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
                              <div className="w-full h-full flex items-center justify-center text-xs opacity-50">
                                👤
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
