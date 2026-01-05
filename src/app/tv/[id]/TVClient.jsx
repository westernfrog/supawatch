"use client";

import { Play, Volume2, VolumeX, Star, Info } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import posthog from "posthog-js";

export default function TVClient({ id, initialData }) {
  const [data, setData] = useState(initialData || null);
  const [logo, setLogo] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [credits, setCredits] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [play, setPlay] = useState(false);
  const [playEpisode, setPlayEpisode] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState("1");
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

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

        const response = await fetch(
          `/api/getTVSeriesDetailsEnhanced?id=${id}`
        );
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
        console.error("Error fetching TV data:", error);
      }
    }

    if (id) {
      fetchAllData();
    }
  }, [id]);

  // Fetch episodes when season changes
  useEffect(() => {
    async function fetchEpisodes() {
      if (!id || !selectedSeason) return;

      setLoadingEpisodes(true);
      try {
        const response = await fetch(
          `/api/getEpisodes?id=${id}&season=${selectedSeason}`
        );
        const fetchedData = await response.json();
        setEpisodes(fetchedData.data?.episodes || []);
      } catch (error) {
        console.error("Error fetching episodes:", error);
        setEpisodes([]);
      } finally {
        setLoadingEpisodes(false);
      }
    }

    fetchEpisodes();
  }, [id, selectedSeason]);

  // Update document title when data loads
  useEffect(() => {
    if (data?.original_name || data?.name) {
      document.title = `${data.name || data.original_name} | Supawatch`;
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
          const iframe = document.getElementById("tv-detail-trailer");
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
          // Determine if recommendation is Movie or TV (usually mixed or same type)
          // For simplicity assuming TV->TV recommendations use TV endpoint
          const endpoint =
            selectedRec.media_type === "movie"
              ? `/api/getMovieDetailsEnhanced?id=${selectedRec.id}`
              : `/api/getTVSeriesDetailsEnhanced?id=${selectedRec.id}`;

          const response = await fetch(endpoint);
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

  const handleOpenRecDialog = (media) => {
    setSelectedRec(media);
    setRecOpen(true);

    posthog.capture("recommendation_clicked", {
      recommendation_id: media.id,
      recommendation_title: media.name || media.title,
      source_tv_id: id,
      source_tv_name: data?.name,
      media_type: "tv",
    });
  };

  const handlePlayTV = () => {
    setPlay(true);

    posthog.capture("tv_play_started", {
      tv_id: id,
      tv_name: data?.name,
      first_air_date: data?.first_air_date?.slice(0, 4),
      vote_average: data?.vote_average,
      genres: data?.genres?.map((g) => g.name),
    });
  };

  // Helper to map genre IDs to names if needed, or use existing names
  // TMDB often returns full genre objects for details
  const getGenres = (genres) => {
    return genres || [];
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
                    id="tv-detail-trailer"
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
                  src={`https://image.tmdb.org/t/p/original${data.backdrop_path}`}
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
                    alt={data.name || data.original_name}
                    className="max-w-lg max-h-40 object-contain"
                  />
                )}
                {!logo && (
                  <h1 className="text-6xl font-black text-white drop-shadow-lg max-w-4xl">
                    {data.name || data.original_name}
                  </h1>
                )}

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span className="text-green-500 font-semibold">
                    {Math.floor(data.vote_average * 10)}% Match
                  </span>
                  <span className="opacity-80">
                    {data.first_air_date?.slice(0, 4)}
                  </span>
                  {data.number_of_seasons && (
                    <span className="opacity-80 border border-white/10 px-2 py-1 rounded bg-black/20 backdrop-blur-sm">
                      {data.number_of_seasons} Season
                      {data.number_of_seasons > 1 ? "s" : ""}
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
                      onClick={handlePlayTV}
                      className="flex gap-2 items-center px-10 py-4 bg-white text-black rounded font-semibold hover:bg-white/90 shrink-0"
                    >
                      <Play className="w-6 h-6 fill-black" />
                      Watch Series
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
                    id="tv-detail-trailer-mobile"
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
                  alt={data.name}
                  className="max-w-48 max-h-14 object-contain"
                />
              )}
              {!logo && (
                <h1 className="text-lg font-bold">
                  {data.name || data.original_name}
                </h1>
              )}

              <button
                onClick={handlePlayTV}
                className="flex gap-2 items-center px-6 py-2.5 bg-white text-black rounded font-semibold text-sm"
              >
                <Play className="w-4 h-4 fill-black" />
                Watch Series
              </button>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-green-500 font-semibold">
                  {Math.floor(data.vote_average * 10)}% Match
                </span>
                <span className="opacity-80">
                  {data.first_air_date?.slice(0, 4)}
                </span>
                {data.number_of_seasons && (
                  <span className="opacity-80 border border-white/10 px-2 py-0.5 rounded text-xs">
                    {data.number_of_seasons} Season
                    {data.number_of_seasons > 1 ? "s" : ""}
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
              <DialogTitle className="sr-only">Watch Series</DialogTitle>
              <iframe
                className="w-full h-full rounded-md"
                src={`https://vidsrcme.ru/embed/tv?tmdb=${id}&season=1&episode=1`}
                allowFullScreen
              ></iframe>
            </DialogContent>
          </Dialog>

          {/* Episode Player Dialog */}
          <Dialog
            open={!!playEpisode}
            onOpenChange={(open) => !open && setPlayEpisode(null)}
          >
            <DialogContent className="lg:max-w-[80vw]! lg:h-[90vh]! w-full p-0 border-none bg-black">
              <DialogTitle className="sr-only">Watch Episode</DialogTitle>
              {playEpisode && (
                <iframe
                  className="w-full h-full rounded-md"
                  src={`https://vidsrcme.ru/embed/tv?tmdb=${id}&season=${playEpisode.season}&episode=${playEpisode.episode}`}
                  allowFullScreen
                ></iframe>
              )}
            </DialogContent>
          </Dialog>

          {/* Netflix-style Episodes Section */}
          {data.seasons &&
            data.seasons.filter((s) => s.season_number > 0).length > 0 && (
              <section className="relative py-12 bg-[#141414]">
                <div className="lg:px-12 px-6 flex items-center justify-between mb-8">
                  <h2 className="lg:text-2xl text-xl font-semibold text-white">
                    Episodes
                  </h2>
                  <Select
                    value={selectedSeason}
                    onValueChange={setSelectedSeason}
                  >
                    <SelectTrigger className="w-44 bg-[#242424] border-white/10 text-white hover:bg-[#333] transition-colors">
                      <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#242424] border-white/10">
                      {data.seasons
                        .filter((s) => s.season_number > 0)
                        .map((s) => (
                          <SelectItem
                            key={s.id}
                            value={String(s.season_number)}
                            className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                          >
                            Season {s.season_number}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="lg:px-12 px-6">
                  {loadingEpisodes ? (
                    <div className="space-y-6">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="animate-pulse flex items-center gap-6 py-5 border-b border-white/5"
                        >
                          <div className="w-8 h-8 bg-white/5 rounded shrink-0"></div>
                          <div className="w-36 lg:w-48 h-24 lg:h-28 bg-white/5 rounded shrink-0"></div>
                          <div className="flex-1 space-y-3">
                            <div className="h-5 bg-white/5 rounded w-1/3"></div>
                            <div className="h-4 bg-white/5 rounded w-3/4"></div>
                          </div>
                          <div className="w-12 h-6 bg-white/5 rounded shrink-0"></div>
                        </div>
                      ))}
                    </div>
                  ) : episodes.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {episodes.map((episode, index) => (
                        <div
                          key={episode.id}
                          onClick={() =>
                            setPlayEpisode({
                              season: episode.season_number,
                              episode: episode.episode_number,
                            })
                          }
                          className="group flex items-center gap-5 lg:gap-8 py-5 cursor-pointer rounded-lg hover:bg-[#232323] transition-all duration-200 -mx-4 px-4"
                        >
                          {/* Episode Number */}
                          <div className="w-8 lg:w-10 shrink-0">
                            <span className="text-xl lg:text-2xl text-white/40 font-medium tabular-nums">
                              {episode.episode_number}
                            </span>
                          </div>

                          {/* Thumbnail with Play Overlay */}
                          <div className="relative w-36 lg:w-48 aspect-video shrink-0 rounded overflow-hidden bg-[#333]">
                            <img
                              src={
                                episode.still_path
                                  ? `https://image.tmdb.org/t/p/w400${episode.still_path}`
                                  : `https://image.tmdb.org/t/p/w400${data.backdrop_path}`
                              }
                              alt={episode.name}
                              className="w-full h-full object-cover"
                            />
                            {/* Play button overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-200">
                              <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 bg-black/30 backdrop-blur-sm">
                                <Play className="w-5 h-5 fill-white ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Episode Details */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <h3 className="text-white font-medium text-base lg:text-lg leading-tight">
                              {episode.name}
                            </h3>
                            <p className="text-white/50 text-sm leading-relaxed line-clamp-2 hidden lg:block">
                              {episode.overview || "No description available."}
                            </p>
                            <p className="text-white/50 text-xs leading-relaxed line-clamp-1 lg:hidden">
                              {episode.overview || "No description available."}
                            </p>
                          </div>

                          {/* Duration */}
                          <div className="shrink-0 hidden sm:block">
                            <span className="text-white/40 text-sm lg:text-base font-medium">
                              {episode.runtime ? `${episode.runtime}m` : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-white/40 text-lg">
                        No episodes available for this season yet.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

          {recommendations?.results && recommendations.results.length > 0 && (
            <section className="relative">
              <div className="lg:px-12 px-6 pt-10 flex items-center justify-between">
                <h2 className="lg:text-3xl text-2xl text-mdnichrome mb-6 font-semibold">
                  More Like This
                </h2>
              </div>
              <div className="lg:px-12 px-6">
                <div className="flex items-center gap-4 overflow-x-auto py-3 pb-10 ps-1 snap-x scrollbar-hide">
                  {recommendations.results.slice(0, 15).map((media, index) => (
                    <div
                      key={`${media.id}-${index}`}
                      onClick={() => handleOpenRecDialog(media)}
                      className="relative group shrink-0 lg:w-72 w-56 snap-start h-full cursor-pointer"
                    >
                      <div className="relative rounded-lg overflow-hidden bg-white/5 transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-2xl">
                        <img
                          src={
                            media.poster_path
                              ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
                              : "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=60"
                          }
                          alt={media.name || media.title}
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
                  {selectedRec.name || selectedRec.title} - Details
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
                          alt={selectedRec.name || selectedRec.title}
                          className="max-w-md max-h-24 object-contain"
                        />
                      )}

                      {/* Assuming check for movie/tv to determine link */}
                      <Link
                        href={`/${
                          selectedRec.media_type === "movie" ? "movie" : "tv"
                        }/${selectedRec.id}`}
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
                        alt={selectedRec.name || selectedRec.title}
                        className="max-w-50 max-h-16 object-contain"
                      />
                    )}
                    <Link
                      href={`/${
                        selectedRec.media_type === "movie" ? "movie" : "tv"
                      }/${selectedRec.id}`}
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
                            {selectedRec.first_air_date?.slice(0, 4) ||
                              selectedRec.release_date?.slice(0, 4)}
                          </span>
                        </div>

                        <p className="text-base leading-relaxed opacity-90">
                          {selectedRec.overview}
                        </p>

                        {selectedRec.genre_ids && (
                          <div className="flex flex-wrap gap-2">
                            {/* Only showing IDs if names not available, or trying to map if we had a full genre map */}
                            {selectedRec.genre_ids.map((id) => (
                              <span
                                key={id}
                                className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium"
                              >
                                Genre {id}
                              </span>
                            ))}
                          </div>
                        )}
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
