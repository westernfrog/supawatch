"use client";

import { Play, LayoutGrid, Volume2, VolumeX, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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

export default function Overview() {
  const [data, setData] = useState(null);
  const [trailers, setTrailers] = useState([]);
  const [logos, setLogos] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [credits, setCredits] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [currentMovieId, setCurrentMovieId] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [progressKey, setProgressKey] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        // Select a random genre
        const genreIds = Object.keys(genresById);
        const randomGenreId =
          genreIds[Math.floor(Math.random() * genreIds.length)];
        setSelectedGenre({
          id: randomGenreId,
          name: genresById[randomGenreId],
        });

        const response = await fetch(
          `/api/getMovieDiscover?genre=${randomGenreId}&page=1`
        );
        const fetchedData = await response.json();
        setData(fetchedData.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    async function fetchMovieData(movieId) {
      try {
        const response = await fetch(
          `/api/getMovieDetailsEnhanced?id=${movieId}`
        );
        const data = await response.json();

        if (data.trailer?.key) {
          setTrailers((prev) => [
            ...prev,
            { id: movieId, key: data.trailer.key },
          ]);
        }

        if (data.logo) {
          setLogos((prev) => ({ ...prev, [movieId]: data.logo }));
        }
      } catch (error) {
        console.error("Error fetching movie data:", error);
      }
    }

    if (data) {
      Promise.allSettled(
        data.results.slice(0, 8).map((item) => fetchMovieData(item.id))
      );
    }
  }, [data]);

  useEffect(() => {
    async function fetchMovieDetails() {
      if (currentMovieId) {
        try {
          const response = await fetch(
            `/api/getMovieDetailsEnhanced?id=${currentMovieId}`
          );
          const fetchedData = await response.json();
          setMovieDetails(fetchedData.data);
          if (fetchedData.credits) {
            setCredits({ data: fetchedData.credits });
          }
        } catch (error) {
          console.error("Error fetching movie details:", error);
        }
      }
    }

    if (open && currentMovieId) {
      fetchMovieDetails();
    } else {
      setMovieDetails(null);
      setCredits(null);
    }
  }, [open, currentMovieId]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setShowTrailer(false);
      setIsMuted(true);
      const timer = setTimeout(() => {
        setShowTrailer(true);

        const checkPlayer = setInterval(() => {
          const iframe = document.getElementById("overview-trailer-player");
          if (iframe && window.YT && window.YT.Player) {
            try {
              const player = new window.YT.Player(iframe);
              player.setPlaybackQuality("hd1080");
              clearInterval(checkPlayer);
            } catch (e) {}
          }
        }, 500);

        setTimeout(() => clearInterval(checkPlayer), 10000);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowTrailer(false);
      setCredits(null);
    }
  }, [open]);

  const totalPages = data
    ? Math.min(Math.ceil(data.results?.length / 1), 8)
    : 0;

  useEffect(() => {
    if (open) return;

    setProgressKey((prev) => prev + 1);

    const interval = setInterval(() => {
      const nextPage = (currentPage + 1) % totalPages;
      setCurrentPage(nextPage);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentPage, totalPages, open]);

  const changePage = (page) => {
    setCurrentPage(page);
    setProgressKey((prev) => prev + 1);
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

  const getGenres = (genreIds) => {
    return genreIds.map((id) => ({ id, name: genresById[id] }));
  };

  const handleOpenDialog = (movieId) => {
    setCurrentMovieId(movieId);
    setOpen(true);
  };

  return (
    <>
      {data ? (
        data &&
        data.results
          .slice(currentPage * 1, currentPage * 1 + 1)
          .map((item, index) => (
            <main key={index} className="relative">
              <section className="hidden lg:block">
                <div className="absolute top-0 inset-0 overflow-hidden">
                  <div className="relative h-full">
                    <img
                      src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                      alt="Backdrop"
                      className="w-full h-full object-cover object-top animate-[kenburns_20s_ease-in-out_infinite_alternate]"
                      style={{
                        animation:
                          "kenburns 20s ease-in-out infinite alternate",
                      }}
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/20 to-[#010101] via-60%"></div>
                    <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent via-50%"></div>
                    <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-transparent to-transparent opacity-80"></div>
                  </div>
                </div>

                <div className="h-screen relative flex items-center">
                  {selectedGenre && (
                    <div className="absolute top-32 right-0 z-40">
                      <div className="relative">
                        <div className="bg-[#E50914] text-white px-8 py-2.5 pr-12 shadow-lg">
                          <span className="text-sm font-bold uppercase tracking-[0.15em]">
                            {selectedGenre.name} Spotlight
                          </span>
                        </div>
                        <div className="absolute top-full right-0 w-0 h-0 border-t-10 border-t-[#9a0610] border-r-10 border-r-transparent"></div>
                      </div>
                    </div>
                  )}

                  <div className="absolute z-30 inset-x-12 bottom-12 flex items-end justify-between">
                    <div className="space-y-5 max-w-2xl animate-[fadeInUp_0.8s_ease-out]">
                      {logos[item.id] ? (
                        <div className="mb-12 origin-bottom-left transition-transform duration-700">
                          <img
                            src={`https://image.tmdb.org/t/p/w500${
                              logos[item.id]
                            }`}
                            alt={item.title}
                            className="w-auto max-h-48 object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
                          />
                        </div>
                      ) : (
                        <h1 className="text-5xl md:text-6xl font-bold text-white mb-12 drop-shadow-2xl leading-[0.95] text-mdnichrome">
                          {item.title}
                        </h1>
                      )}

                      <div className="flex items-center gap-3 mb-6 font-medium text-white/90 drop-shadow-md">
                        <span className="text-[#46d369] font-bold text-base">
                          {Math.floor(item.vote_average * 10)}% Match
                        </span>
                        <span className="text-white/40">|</span>
                        <span className="text-white/80">
                          {item.release_date?.slice(0, 4)}
                        </span>
                        <span className="text-white/40">|</span>
                        <span className="px-2 py-0.5 border border-white/30 rounded text-xs font-semibold uppercase bg-white/5">
                          HD
                        </span>
                      </div>

                      <p className="text-base md:text-lg leading-relaxed text-white/80 drop-shadow-lg line-clamp-3 max-w-xl">
                        {item.overview}
                      </p>

                      <div className="flex items-center gap-4 pt-2">
                        <Link
                          href={`/movie/${item.id}`}
                          className="group flex gap-2.5 items-center px-7 py-3 bg-white text-black rounded hover:bg-white/90 transition-all active:scale-95"
                        >
                          <Play className="w-5 h-5 fill-black" />
                          <span className="text-base font-bold">Watch Now</span>
                        </Link>

                        <button
                          onClick={() => handleOpenDialog(item.id)}
                          className="group flex gap-2.5 items-center px-7 py-3 bg-white/20 text-white rounded hover:bg-white/30 backdrop-blur-md transition-all active:scale-95"
                        >
                          <InfoIcon className="w-5 h-5" />
                          <span className="text-base font-semibold">
                            More Info
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-6">
                      <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                        <button
                          onClick={() =>
                            changePage(
                              currentPage > 0 ? currentPage - 1 : totalPages - 1
                            )
                          }
                          className="p-3 rounded-full hover:bg-white/20 transition-colors text-white"
                          aria-label="Previous"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                        <div className="w-px h-6 bg-white/20"></div>
                        <button
                          onClick={() =>
                            changePage(
                              currentPage < totalPages - 1 ? currentPage + 1 : 0
                            )
                          }
                          className="p-3 rounded-full hover:bg-white/20 transition-colors text-white"
                          aria-label="Next"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>

                      {data.results
                        .slice(currentPage + 1, currentPage + 2)
                        .map((nextItem) => (
                          <div
                            key={`${nextItem.id}-${progressKey}`}
                            className="group relative w-96 aspect-video rounded-lg overflow-hidden cursor-pointer shadow-2xl ring-1 ring-white/30 hover:ring-white/40 transition-all duration-300 bg-[#1a1a1a]"
                            onClick={() => changePage(currentPage + 1)}
                          >
                            <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] font-bold uppercase tracking-wider text-white/90 border border-white/10">
                              Next Up
                            </div>
                            <img
                              src={`https://image.tmdb.org/t/p/w500${nextItem.backdrop_path}`}
                              alt={nextItem.title}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                            />
                            {/* Progress Overlay - unfades from left to right over 15s */}
                            <div
                              className="absolute inset-0 bg-linear-to-r from-white/25 via-white/15 to-white/10 pointer-events-none"
                              style={{
                                animation: "progressUnfade 15s linear forwards",
                              }}
                            ></div>
                            <style jsx>{`
                              @keyframes progressUnfade {
                                from {
                                  clip-path: inset(0 0 0 0);
                                }
                                to {
                                  clip-path: inset(0 0 0 100%);
                                }
                              }
                            `}</style>
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-linear-to-t from-black via-black/80 to-transparent pt-12">
                              <h4 className="text-white font-bold text-base truncate drop-shadow-md transition-colors">
                                {nextItem.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                                <span>
                                  {nextItem.release_date?.slice(0, 4)}
                                </span>
                                <span>•</span>
                                <span className="text-[#46d369]">
                                  {Math.floor(nextItem.vote_average * 10)}%
                                  Match
                                </span>
                              </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/40">
                                <Play className="w-5 h-5 fill-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="lg:hidden">
                <div className="relative h-64">
                  {showTrailer &&
                  trailers.find((t) => t.id === item.id)?.key ? (
                    <div className="absolute inset-0 overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${
                          trailers.find((t) => t.id === item.id).key
                        }?autoplay=1&mute=1&loop=1&playlist=${
                          trailers.find((t) => t.id === item.id).key
                        }&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&cc_load_policy=0&autohide=1&enablejsapi=1`}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay; encrypted-media"
                        style={{
                          border: "none",
                          pointerEvents: "none",
                          transform: "scale(1.3)",
                          objectFit: "cover",
                        }}
                      ></iframe>
                    </div>
                  ) : (
                    <img
                      src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                      alt="Backdrop"
                      className="w-full h-full object-cover object-top"
                    />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-black/20 to-transparent"></div>

                  {showTrailer &&
                    trailers.find((t) => t.id === item.id)?.key && (
                      <button
                        onClick={handleMuteToggle}
                        className="absolute bottom-3 right-3 z-20 p-2.5 rounded-full border-2 border-white/60 bg-black/40 backdrop-blur-sm"
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                </div>

                <div className="px-4 py-5 space-y-4 bg-[#010101]">
                  {logos[item.id] ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${logos[item.id]}`}
                      alt={item.title}
                      className="max-w-48 max-h-16 object-contain"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-white leading-tight">
                      {item.title}
                    </h1>
                  )}

                  <div className="flex items-center gap-3 text-sm font-medium text-white/90">
                    <span className="text-[#46d369] font-bold">
                      {Math.floor(item.vote_average * 10)}% Match
                    </span>
                    <span className="text-white/60">•</span>
                    <span>{item.release_date?.slice(0, 4)}</span>
                    <span className="text-white/60">•</span>
                    <span className="px-2 py-0.5 border border-white/40 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10">
                      HD
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Link
                      href={`/movie/${item.id}`}
                      className="flex gap-2 w-full items-center justify-center px-6 py-2.5 bg-white text-black rounded font-bold text-sm hover:bg-white/90 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>Play</span>
                    </Link>
                    <button
                      onClick={() => handleOpenDialog(item.id)}
                      className="flex gap-2 w-full items-center justify-center px-6 py-2.5 bg-neutral-800 text-white rounded font-bold text-sm hover:bg-neutral-700 transition-colors"
                    >
                      <InfoIcon className="w-4 h-4" />
                      <span>More Info</span>
                    </button>
                  </div>

                  <p className="text-sm opacity-80 leading-relaxed line-clamp-3 font-light text-white/90">
                    {item.overview}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                    <button
                      onClick={() =>
                        changePage(
                          currentPage > 0 ? currentPage - 1 : totalPages - 1
                        )
                      }
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                      aria-label="Previous"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPages }, (_, idx) => (
                        <button
                          key={idx}
                          onClick={() => changePage(idx)}
                          className={`rounded-full transition-all duration-300 ${
                            currentPage === idx
                              ? "bg-white w-6 h-1.5"
                              : "bg-white/20 w-1.5 h-1.5 hover:bg-white/40"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        changePage(
                          currentPage < totalPages - 1 ? currentPage + 1 : 0
                        )
                      }
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                      aria-label="Next"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </section>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="lg:max-w-6xl max-lg:max-w-none p-0 border-none bg-[#010101] overflow-hidden">
                  <DialogTitle className="sr-only">Movie Details</DialogTitle>
                  <div className="relative max-h-[90vh] overflow-y-auto overscroll-contain">
                    <div className="relative lg:h-125 h-48">
                      {showTrailer &&
                      trailers.find((t) => t.id === item.id)?.key ? (
                        <div className="absolute inset-0 overflow-hidden">
                          <iframe
                            id="overview-trailer-player"
                            src={`https://www.youtube.com/embed/${
                              trailers.find((t) => t.id === item.id)?.key
                            }?autoplay=1&mute=1&loop=1&playlist=${
                              trailers.find((t) => t.id === item.id)?.key
                            }&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&cc_load_policy=0&autohide=1&enablejsapi=1`}
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
                          src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                          alt="Backdrop"
                          className="w-full h-full object-cover object-top"
                        />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-black/40 to-transparent"></div>

                      <div className="hidden lg:block absolute bottom-6 left-6 right-6 z-10 space-y-4">
                        {logos[item.id] && (
                          <img
                            src={`https://image.tmdb.org/t/p/w500${
                              logos[item.id]
                            }`}
                            alt={item.title}
                            className="max-w-md max-h-24 object-contain"
                          />
                        )}
                        <Link
                          href={`/movie/${item.id}`}
                          className="inline-flex gap-2 items-center px-8 py-3 bg-white text-black rounded font-semibold hover:bg-white/90"
                        >
                          <Play className="w-5 h-5 fill-black" />
                          <span>Watch Now</span>
                        </Link>
                      </div>

                      {showTrailer &&
                        trailers.find((t) => t.id === item.id)?.key && (
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

                    <div className="lg:hidden px-4 py-4 space-y-3 bg-[#010101]">
                      {logos[item.id] && (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${
                            logos[item.id]
                          }`}
                          alt={item.title}
                          className="max-w-50 max-h-16 object-contain"
                        />
                      )}
                      <Link
                        href={`/movie/${item.id}`}
                        className="inline-flex gap-2 items-center px-6 py-2.5 bg-white text-black rounded font-semibold hover:bg-white/90 text-sm"
                      >
                        <Play className="w-4 h-4 fill-black" />
                        <span>Watch Now</span>
                      </Link>
                    </div>

                    <div className="relative lg:p-8 p-4">
                      <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-5">
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="text-green-500 font-semibold">
                              {Math.floor(item.vote_average * 10)}% Match
                            </span>
                            <span className="opacity-80">
                              {item.release_date?.slice(0, 4)}
                            </span>
                            {movieDetails?.runtime && (
                              <span className="opacity-80 border border-white/20 px-2 py-0.5 rounded text-xs">
                                {Math.floor(movieDetails.runtime / 60)}h{" "}
                                {movieDetails.runtime % 60}m
                              </span>
                            )}
                            <span className="opacity-60 text-xs">
                              ⭐ {item.vote_average?.toFixed(1)} (
                              {item.vote_count?.toLocaleString()} votes)
                            </span>
                          </div>

                          <p className="text-sm lg:text-base leading-relaxed opacity-90">
                            {item.overview}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {getGenres(item.genre_ids).map((genre) => (
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
                            {movieDetails?.production_companies?.length > 0 && (
                              <p>
                                <span className="opacity-60">Studio: </span>
                                {movieDetails.production_companies
                                  .slice(0, 2)
                                  .map((c) => c.name)
                                  .join(", ")}
                              </p>
                            )}
                            {movieDetails?.spoken_languages?.length > 0 && (
                              <p>
                                <span className="opacity-60">Language: </span>
                                {movieDetails.spoken_languages[0]?.english_name}
                              </p>
                            )}
                          </div>
                        </div>

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
                                      <span className="text-sm opacity-50">
                                        👤
                                      </span>
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
            </main>
          ))
      ) : (
        <section className="relative h-screen animate-pulse">
          <div className="bg-linear-to-b from-white/20 from-10% via-black/10 via-80% to-black/20 to-90% h-full w-full flex flex-col items-center justify-center"></div>
        </section>
      )}
    </>
  );
}
