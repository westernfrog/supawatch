"use client";

import { Play, Volume2, VolumeX, Star } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import posthog from "posthog-js";

export default function MovieClient({ id, initialData }) {
  const [data, setData] = useState(initialData || null);
  const [logo, setLogo] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [credits, setCredits] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [play, setPlay] = useState(false);

  const [recOpen, setRecOpen] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);
  const [recTrailer, setRecTrailer] = useState(null);
  const [recCredits, setRecCredits] = useState(null);
  const [recLogo, setRecLogo] = useState(null);
  const [showRecTrailer, setShowRecTrailer] = useState(false);
  const [isRecMuted, setIsRecMuted] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      try {
        // Reset all state before fetching to prevent stale data
        setData(null);
        setLogo(null);
        setTrailer(null);
        setCredits(null);
        setRecommendations(null);

        const response = await fetch(`/api/getMovieDetailsEnhanced?id=${id}`);
        const fetchedData = await response.json();

        setData(fetchedData.data);

        if (fetchedData.logo) {
          setLogo(fetchedData.logo);
        }

        if (fetchedData.trailer?.key) {
          setTrailer(fetchedData.trailer.key);
        }

        if (fetchedData.credits) {
          setCredits({ data: fetchedData.credits });
        }

        if (fetchedData.recommendations) {
          setRecommendations(fetchedData.recommendations);
        }
      } catch (error) {
        console.error("Error fetching movie data:", error);
      }
    }

    if (id) {
      fetchAllData();
    }
  }, [id]);

  // Update document title when data loads
  useEffect(() => {
    if (data?.title) {
      document.title = `${data.title} | Supawatch`;
    }
  }, [data]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    if (trailer) {
      const timer = setTimeout(() => {
        setShowTrailer(true);

        const checkPlayer = setInterval(() => {
          const iframe = document.getElementById("movie-detail-trailer");
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
    }
  }, [trailer]);

  useEffect(() => {
    async function fetchRecDetails() {
      if (selectedRec) {
        try {
          const response = await fetch(
            `/api/getMovieDetailsEnhanced?id=${selectedRec.id}`
          );
          const fetchedData = await response.json();

          if (fetchedData.trailer?.key) {
            setRecTrailer(fetchedData.trailer.key);
          }

          if (fetchedData.credits) {
            setRecCredits({ data: fetchedData.credits });
          }

          if (fetchedData.logo) {
            setRecLogo(fetchedData.logo);
          }
        } catch (error) {
          console.error("Error fetching recommendation details:", error);
        }
      }
    }

    if (recOpen && selectedRec) {
      fetchRecDetails();
    }
  }, [recOpen, selectedRec]);

  useEffect(() => {
    if (recOpen) {
      setShowRecTrailer(false);
      setIsRecMuted(true);
      const timer = setTimeout(() => {
        setShowRecTrailer(true);

        const checkPlayer = setInterval(() => {
          const iframe = document.getElementById("rec-trailer-player");
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
      setShowRecTrailer(false);
      setRecTrailer(null);
      setRecCredits(null);
      setRecLogo(null);
    }
  }, [recOpen]);

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

  const handleRecMuteToggle = () => {
    const iframe = document.getElementById("rec-trailer-player");
    if (iframe && iframe.contentWindow) {
      const command = isRecMuted
        ? '{"event":"command","func":"unMute","args":""}'
        : '{"event":"command","func":"mute","args":""}';
      iframe.contentWindow.postMessage(command, "*");
      setIsRecMuted(!isRecMuted);
    }
  };

  const handleOpenRecDialog = (movie) => {
    setSelectedRec(movie);
    setRecOpen(true);

    // PostHog: Track recommendation clicked
    posthog.capture("recommendation_clicked", {
      recommendation_id: movie.id,
      recommendation_title: movie.title,
      source_movie_id: id,
      source_movie_title: data?.title,
      media_type: "movie",
    });
  };

  const handlePlayMovie = () => {
    setPlay(true);

    // PostHog: Track movie play started
    posthog.capture("movie_play_started", {
      movie_id: id,
      movie_title: data?.title,
      release_year: data?.release_date?.slice(0, 4),
      vote_average: data?.vote_average,
      genres: data?.genres?.map((g) => g.name),
    });
  };

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

  const getGenres = (genres) => {
    return (
      genres?.map((genre) => ({
        id: genre.id,
        name: movieGenres[genre.id] || genre.name,
      })) || []
    );
  };

  return (
    <>
      {data && data.id ? (
        <>
          <section className="relative min-h-screen hidden lg:block">
            <div className="absolute inset-0">
              {showTrailer && trailer ? (
                <div className="absolute inset-0 overflow-hidden">
                  <iframe
                    id="movie-detail-trailer"
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
                  src={`https://image.tmdb.org/t/p/original${data.backdrop_path}}`}
                  alt="Backdrop"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-black/40 to-transparent"></div>
              <div className="absolute inset-0 bg-linear-to-r from-black/60 via-transparent to-transparent"></div>
            </div>

            <div className="relative z-10 flex items-end min-h-screen">
              <div className="px-12 pb-16 pt-24 w-full space-y-8">
                {logo && (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${logo}`}
                    alt={data.title}
                    className="max-w-lg max-h-40 object-contain"
                  />
                )}
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span className="text-green-500 font-semibold">
                    {Math.floor(data.vote_average * 10)}% Match
                  </span>
                  <span className="opacity-80">
                    {data.release_date?.slice(0, 4)}
                  </span>
                  {data.runtime && (
                    <span className="opacity-80 border border-white/10 px-2 py-1 rounded bg-black/20 backdrop-blur-sm">
                      {Math.floor(data.runtime / 60)}h {data.runtime % 60}m
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {getGenres(data.genres)
                    .slice(0, 4)
                    .map((genre) => (
                      <Link
                        key={genre.id}
                        href={`/genre/${genre.id}`}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/15 rounded-full text-sm backdrop-blur-sm transition-colors"
                      >
                        {genre.name}
                      </Link>
                    ))}
                </div>
                <p className="text-lg opacity-90 leading-relaxed line-clamp-4 max-w-3xl">
                  {data.overview}
                </p>
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayMovie}
                      className="flex gap-2 items-center px-10 py-4 bg-white text-black rounded font-semibold hover:bg-white/90 shrink-0"
                    >
                      <Play className="w-6 h-6 fill-black" />
                      Play Movie
                    </button>

                    {showTrailer && trailer && (
                      <button
                        onClick={handleMuteToggle}
                        className="p-3.5 rounded-full border-2 border-white/60 hover:border-white bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all shrink-0"
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
                  {credits?.data?.cast && credits.data.cast.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide max-w-[60%]">
                      {credits.data.cast.slice(0, 12).map((actor) => (
                        <Link
                          key={actor.id}
                          href={`/person/${actor.id}`}
                          className="shrink-0 group"
                        >
                          <div className="flex flex-col items-center gap-1.5 w-16">
                            <div className="relative rounded-full overflow-hidden w-14 h-14 bg-white/10 ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
                              {actor.profile_path ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                                  alt={actor.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                  <span className="text-xl opacity-30">👤</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-center truncate w-full font-medium group-hover:text-white/80 transition-colors leading-tight">
                              {actor.name}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="lg:hidden">
            <div className="relative h-64">
              {showTrailer && trailer ? (
                <div className="absolute inset-0 overflow-hidden">
                  <iframe
                    id="movie-detail-trailer-mobile"
                    src={`https://www.youtube.com/embed/${trailer}?autoplay=1&mute=1&loop=1&playlist=${trailer}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&cc_load_policy=0&autohide=1&enablejsapi=1`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media"
                    style={{
                      border: "none",
                      pointerEvents: "none",
                      transform: "scale(1.6)",
                      objectFit: "cover",
                    }}
                  ></iframe>
                </div>
              ) : (
                <img
                  src={`https://image.tmdb.org/t/p/original${data.backdrop_path}}`}
                  alt="Backdrop"
                  className="w-full h-full object-cover object-top"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-black/20 to-transparent"></div>

              {showTrailer && trailer && (
                <button
                  onClick={handleMuteToggle}
                  className="absolute bottom-3 right-3 z-20 p-2.5 rounded-full border-2 border-white/60 bg-black/40 backdrop-blur-sm"
                  aria-label={isMuted ? "Unmute" : "Mute"}
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
              {logo && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${logo}`}
                  alt={data.title}
                  className="max-w-48 max-h-14 object-contain"
                />
              )}

              <button
                onClick={handlePlayMovie}
                className="flex gap-2 items-center px-6 py-2.5 bg-white text-black rounded font-semibold text-sm"
              >
                <Play className="w-4 h-4 fill-black" />
                Play Movie
              </button>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-green-500 font-semibold">
                  {Math.floor(data.vote_average * 10)}% Match
                </span>
                <span className="opacity-80">
                  {data.release_date?.slice(0, 4)}
                </span>
                {data.runtime && (
                  <span className="opacity-80 border border-white/10 px-2 py-0.5 rounded text-xs">
                    {Math.floor(data.runtime / 60)}h {data.runtime % 60}m
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {getGenres(data.genres)
                  .slice(0, 4)
                  .map((genre) => (
                    <Link
                      key={genre.id}
                      href={`/genre/${genre.id}`}
                      className="px-3 py-1 bg-white/10 rounded-full text-xs"
                    >
                      {genre.name}
                    </Link>
                  ))}
              </div>

              <p className="text-sm opacity-90 leading-relaxed">
                {data.overview}
              </p>

              {credits?.data?.cast && credits.data.cast.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-sm font-semibold mb-3 opacity-70">
                    Cast
                  </h3>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {credits.data.cast.slice(0, 10).map((actor) => (
                      <Link
                        key={actor.id}
                        href={`/person/${actor.id}`}
                        className="shrink-0"
                      >
                        <div className="flex flex-col items-center gap-1 w-14">
                          <div className="relative rounded-full overflow-hidden w-12 h-12 bg-white/10">
                            {actor.profile_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                                alt={actor.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5">
                                <span className="text-sm opacity-30">👤</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[9px] text-center truncate w-full opacity-70">
                            {actor.name}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <Dialog open={play} onOpenChange={setPlay}>
            <DialogContent className="lg:max-w-[80vw]! lg:h-[90vh]! w-full p-0 border-none bg-black">
              <DialogTitle className="sr-only">Play Movie</DialogTitle>
              <iframe
                className="w-full h-full rounded-md"
                src={`https://vidsrcme.ru/embed/movie?tmdb=${id}`}
                allowFullScreen
              ></iframe>
            </DialogContent>
          </Dialog>
          {recommendations?.results && recommendations.results.length > 0 && (
            <section className="relative">
              <div className="lg:px-12 px-6 pt-10 flex items-center justify-between">
                <h2 className="lg:text-3xl text-2xl text-mdnichrome mb-6 font-semibold">
                  More Like This
                </h2>
              </div>
              <div className="lg:px-12 px-6">
                <div className="flex items-center gap-4 overflow-x-auto py-3 pb-10 ps-1 snap-x scrollbar-hide">
                  {recommendations.results.slice(0, 15).map((movie, index) => (
                    <div
                      key={`${movie.id}-${index}`}
                      onClick={() => handleOpenRecDialog(movie)}
                      className="relative group shrink-0 lg:w-72 w-56 snap-start h-full cursor-pointer"
                    >
                      <div className="relative rounded-lg overflow-hidden bg-white/5 transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-2xl">
                        <img
                          src={
                            movie.poster_path
                              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                              : "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=60"
                          }
                          alt={movie.title}
                          className="w-full aspect-2/3 object-cover object-center rounded-lg"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black via-black/10 to-transparent opacity-60 group-hover:opacity-100 rounded-lg"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          {selectedRec && (
            <Dialog open={recOpen} onOpenChange={setRecOpen}>
              <DialogContent className="lg:max-w-6xl max-w-[90vw] p-0 border-none bg-[#010101] overflow-hidden">
                <DialogTitle className="sr-only">
                  {selectedRec.title} - Details
                </DialogTitle>
                <div className="max-h-[90vh] overflow-y-auto overscroll-contain">
                  <div className="relative h-56 lg:h-125">
                    {showRecTrailer && recTrailer ? (
                      <div className="absolute inset-0 overflow-hidden">
                        <iframe
                          id="rec-trailer-player"
                          src={`https://www.youtube.com/embed/${recTrailer}?autoplay=1&mute=1&loop=1&playlist=${recTrailer}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&cc_load_policy=0&autohide=1&enablejsapi=1`}
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
                        src={`https://image.tmdb.org/t/p/original/${selectedRec.backdrop_path}`}
                        alt="Backdrop"
                        className="w-full h-full object-cover object-top"
                      />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-[#010101] from-5% to-transparent"></div>

                    <div className="hidden lg:block absolute bottom-6 left-6 right-6 z-10 space-y-4">
                      {recLogo && (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${recLogo}`}
                          alt={selectedRec.title}
                          className="max-w-md max-h-24 object-contain"
                        />
                      )}
                      <Link
                        href={`/movie/${selectedRec.id}`}
                        className="inline-flex gap-2 items-center px-8 py-3 bg-white text-black rounded font-semibold hover:bg-white/90"
                      >
                        <Play className="w-5 h-5 fill-black" />
                        <span>Watch Now</span>
                      </Link>
                    </div>
                    {showRecTrailer && recTrailer && (
                      <button
                        onClick={handleRecMuteToggle}
                        className="absolute bottom-4 right-4 z-20 p-3 rounded-full border-2 border-white/60 hover:border-white bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all"
                        aria-label={isRecMuted ? "Unmute" : "Mute"}
                      >
                        {isRecMuted ? (
                          <VolumeX className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="lg:hidden px-4 py-4 space-y-3 bg-[#010101]">
                    {recLogo && (
                      <img
                        src={`https://image.tmdb.org/t/p/w500${recLogo}`}
                        alt={selectedRec.title}
                        className="max-w-50 max-h-16 object-contain"
                      />
                    )}
                    <Link
                      href={`/movie/${selectedRec.id}`}
                      className="inline-flex gap-2 items-center px-6 py-2.5 bg-white text-black rounded font-semibold hover:bg-white/90 text-sm"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>Watch Now</span>
                    </Link>
                  </div>

                  <div className="relative lg:p-10 p-4">
                    <div className="grid lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="flex flex-wrap items-center gap-4 text-base">
                          <div className="flex items-center gap-2">
                            <span className="text-green-500 font-semibold">
                              {Math.floor(selectedRec.vote_average * 10)}% Match
                            </span>
                          </div>
                          <span className="opacity-80">
                            {selectedRec.release_date?.slice(0, 4)}
                          </span>
                        </div>

                        <p className="text-base leading-relaxed opacity-90">
                          {selectedRec.overview}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {getGenres(
                            selectedRec.genre_ids?.map((id) => ({
                              id,
                              name: movieGenres[id],
                            }))
                          ).map((genre) => (
                            <Link
                              key={genre.id}
                              href={`/genre/${genre.id}`}
                              onClick={() => setRecOpen(false)}
                              className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-full text-sm font-medium"
                            >
                              {genre.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div className="lg:col-span-1 space-y-4">
                        <h3 className="text-xl font-bold">Cast</h3>
                        <div className="space-y-3">
                          {recCredits?.data?.cast?.slice(0, 4).map((actor) => (
                            <Link
                              key={actor.id}
                              href={`/person/${actor.id}`}
                              onClick={() => setRecOpen(false)}
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
          )}
        </>
      ) : (
        <section className="relative h-screen animate-pulse">
          <div className="bg-linear-to-b from-white/20 from-10% via-black/10 via-80% to-black/20 to-90% h-full w-full flex flex-col items-center justify-center"></div>
        </section>
      )}
    </>
  );
}
