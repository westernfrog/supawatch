"use client";

import { Play, LayoutGrid, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          "/api/getMovieList?list=now_playing&page=1"
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
    async function fetchTrailers(movieId) {
      try {
        const response = await fetch(`/api/getTrailer?id=${movieId}`);
        const fetchedTrailer = await response.json();
        setTrailers((prevTrailers) => [
          ...prevTrailers,
          { id: movieId, key: fetchedTrailer.key },
        ]);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }

    async function fetchLogo(movieId) {
      try {
        const response = await fetch(`/api/getMovieImages?id=${movieId}`);
        const fetchedImages = await response.json();
        const englishLogo = fetchedImages.data.logos?.find(
          (logo) => logo.iso_639_1 === "en"
        );
        if (englishLogo) {
          setLogos((prevLogos) => ({
            ...prevLogos,
            [movieId]: englishLogo.file_path,
          }));
        }
      } catch (error) {
        console.error("Error fetching logo:", error);
      }
    }

    if (data) {
      data.results.slice(0, 8).forEach((item) => {
        fetchTrailers(item.id);
        fetchLogo(item.id);
      });
    }
  }, [data]);

  // Fetch movie details and credits when dialog opens
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

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Start trailer after 3 seconds when dialog opens and set HD quality
  useEffect(() => {
    if (open) {
      setShowTrailer(false);
      setIsMuted(true);
      const timer = setTimeout(() => {
        setShowTrailer(true);

        // Set HD quality when player is ready
        const checkPlayer = setInterval(() => {
          const iframe = document.getElementById("overview-trailer-player");
          if (iframe && window.YT && window.YT.Player) {
            try {
              const player = new window.YT.Player(iframe);
              player.setPlaybackQuality("hd1080");
              clearInterval(checkPlayer);
            } catch (e) {
              // Not ready yet
            }
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
    // Don't auto-rotate if dialog is open
    if (open) return;

    const interval = setInterval(() => {
      const nextPage = (currentPage + 1) % totalPages;
      setCurrentPage(nextPage);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentPage, totalPages, open]);

  const changePage = (page) => {
    setCurrentPage(page);
  };

  // Handle mute toggle using YouTube Player API
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
                <div className="absolute top-0 inset-0">
                  <div className="relative h-full">
                    <img
                      src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                      alt="Backdrop"
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute top-0 inset-0 bg-linear-to-b from-black/30 via-black/40 to-[#010101]"></div>
                    <div className="absolute top-0 inset-0 bg-linear-to-r from-black/60 via-transparent to-transparent"></div>
                  </div>
                </div>
                <div className="h-screen">
                  <div className="absolute z-30 inset-10 flex items-end py-6">
                    <div className="space-y-6 w-175">
                      {logos[item.id] && (
                        <div className="mb-8">
                          <img
                            src={`https://image.tmdb.org/t/p/w500${
                              logos[item.id]
                            }`}
                            alt={item.title}
                            className="max-w-xl h-36 object-contain"
                          />
                        </div>
                      )}

                      <p className="text-lg tracking-tight opacity-90">
                        {item.overview.split(" ").slice(0, 50).join(" ") +
                          "..."}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-green-500 font-semibold">
                          {Math.floor(item.vote_average * 10)}% Match
                        </span>
                        <span className="opacity-80">
                          {item.release_date?.slice(0, 4)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/movie/${item.id}`}
                          className="flex gap-2 items-center px-10 py-4 bg-white text-black rounded font-semibold hover:bg-white/90"
                        >
                          <Play className="w-6 h-6 fill-black" />
                          <span>Watch Now</span>
                        </Link>
                        <button
                          onClick={() => handleOpenDialog(item.id)}
                          className="flex gap-2 items-center px-10 py-4 bg-white/10 hover:bg-white/20 text-white rounded font-semibold"
                        >
                          <LayoutGrid className="w-6 h-6" />
                          <span>More Info</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="absolute z-30 bottom-12 left-0 right-0 flex items-center justify-center gap-6">
                    <button
                      onClick={() =>
                        changePage(
                          currentPage > 0 ? currentPage - 1 : totalPages - 1
                        )
                      }
                      className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
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

                    <div className="flex items-center gap-3">
                      {Array.from({ length: totalPages }, (_, index) => (
                        <button
                          key={index}
                          onClick={() => changePage(index)}
                          className={`rounded-full transition-all ${
                            currentPage === index
                              ? "bg-white w-10 h-2.5"
                              : "bg-white/30 w-3 h-2.5 hover:bg-white/50"
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
                      className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
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
                  {logos[item.id] && (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${logos[item.id]}`}
                      alt={item.title}
                      className="max-w-48 max-h-16 object-contain"
                    />
                  )}

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/movie/${item.id}`}
                      className="flex gap-2 items-center px-6 py-2.5 bg-white text-black rounded font-semibold text-sm"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>Watch Now</span>
                    </Link>
                    <button
                      onClick={() => handleOpenDialog(item.id)}
                      className="flex gap-2 items-center px-6 py-2.5 bg-white/10 text-white rounded font-semibold text-sm"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>More Info</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-500 font-semibold">
                      {Math.floor(item.vote_average * 10)}% Match
                    </span>
                    <span className="opacity-80">
                      {item.release_date?.slice(0, 4)}
                    </span>
                  </div>

                  <p className="text-sm opacity-90 leading-relaxed line-clamp-4">
                    {item.overview}
                  </p>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={() =>
                        changePage(
                          currentPage > 0 ? currentPage - 1 : totalPages - 1
                        )
                      }
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Previous"
                    >
                      <svg
                        className="w-4 h-4"
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

                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, idx) => (
                        <button
                          key={idx}
                          onClick={() => changePage(idx)}
                          className={`rounded-full transition-all ${
                            currentPage === idx
                              ? "bg-white w-6 h-2"
                              : "bg-white/30 w-2 h-2 hover:bg-white/50"
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
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Next"
                    >
                      <svg
                        className="w-4 h-4"
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

                    <div className="relative p-8">
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
