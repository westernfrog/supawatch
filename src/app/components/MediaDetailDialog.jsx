"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Volume2,
  VolumeX,
  ChevronDown,
  Calendar,
  Clock,
  InfoIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import posthog from "posthog-js";

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
  878: "Sci-Fi",
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

export default function MediaDetailDialog({
  open,
  onOpenChange,
  item,
  mediaType = "movie",
  linkPrefix,
}) {
  const [trailer, setTrailer] = useState(null);
  const [credits, setCredits] = useState(null);
  const [logo, setLogo] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [recommendations, setRecommendations] = useState(null);

  // TV-specific state
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  const isTV = mediaType === "tv";
  const genres = isTV ? tvGenres : movieGenres;

  const getTitle = (data) => data?.title || data?.name || "";
  const getDate = (data) => data?.release_date || data?.first_air_date || "";

  const getGenres = (genreIds) => {
    if (!genreIds) return [];
    return genreIds
      .map((id) => ({ id, name: genres[id] }))
      .filter((g) => g.name);
  };

  useEffect(() => {
    async function fetchDetails() {
      if (item) {
        try {
          const endpoint = isTV
            ? `/api/getTVSeriesDetailsEnhanced?id=${item.id}`
            : `/api/getMovieDetailsEnhanced?id=${item.id}`;

          const response = await fetch(endpoint);
          const data = await response.json();

          setTrailer(data.trailer?.key);
          setCredits({ data: data.credits });
          setLogo(data.logo);
          setItemDetails(data.data);

          // Extract recommendations
          if (data.recommendations) {
            setRecommendations(data.recommendations);
          }

          // Extract seasons for TV shows (filter out season 0 which is specials)
          if (isTV && data.data?.seasons) {
            const filteredSeasons = data.data.seasons.filter(
              (s) => s.season_number > 0
            );
            setSeasons(filteredSeasons);
            if (filteredSeasons.length > 0) {
              setSelectedSeason(filteredSeasons[0].season_number);
            }
          }
        } catch (error) {
          console.error("Error fetching details:", error);
        }
      }
    }

    if (open && item) {
      fetchDetails();
      // Lock body scroll - stop Lenis and add overflow hidden
      document.body.style.overflow = "hidden";
      if (window.lenis) {
        window.lenis.stop();
      }
    } else if (!open) {
      setItemDetails(null);
      setTrailer(null);
      setCredits(null);
      setLogo(null);
      setRecommendations(null);
      setSeasons([]);
      setEpisodes([]);
      setSelectedSeason(1);
      setShowSeasonDropdown(false);
      // Restore body scroll - resume Lenis and remove overflow hidden
      document.body.style.overflow = "";
      if (window.lenis) {
        window.lenis.start();
      }
    }
  }, [open, item, isTV]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Fetch episodes when season is selected for TV shows
  useEffect(() => {
    async function fetchEpisodes() {
      if (!isTV || !item?.id || !selectedSeason) return;

      setLoadingEpisodes(true);
      try {
        const response = await fetch(
          `/api/getEpisodes?id=${item.id}&season=${selectedSeason}`
        );
        const data = await response.json();
        setEpisodes(data.data?.episodes || []);
      } catch (error) {
        console.error("Error fetching episodes:", error);
        setEpisodes([]);
      } finally {
        setLoadingEpisodes(false);
      }
    }

    if (open && isTV && selectedSeason) {
      fetchEpisodes();
    }
  }, [open, isTV, item?.id, selectedSeason]);

  useEffect(() => {
    if (open) {
      setShowTrailer(false);
      setIsMuted(true);
      const timer = setTimeout(() => {
        setShowTrailer(true);
        const checkPlayer = setInterval(() => {
          const iframe = document.getElementById("media-dialog-trailer");
          if (iframe && window.YT && window.YT.Player) {
            try {
              const player = new window.YT.Player(iframe);
              player.setPlaybackQuality("hd1080");
              clearInterval(checkPlayer);
            } catch (e) {}
          }
        }, 500);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowTrailer(false);
    }
  }, [open]);

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

  const handleWatchNowClick = () => {
    // Restore body scroll before navigation to prevent scroll lock on destination
    document.body.style.overflow = "";
    if (window.lenis) {
      window.lenis.start();
    }

    // PostHog: Track watch now clicked
    posthog.capture("watch_now_clicked", {
      item_id: item?.id,
      item_title: getTitle(item),
      media_type: mediaType,
      vote_average: item?.vote_average,
      release_year: getDate(item)?.slice(0, 4),
    });
  };

  const handleNavigationClick = () => {
    // Restore body scroll before navigation to prevent scroll lock on destination
    document.body.style.overflow = "";
    if (window.lenis) {
      window.lenis.start();
    }
  };

  const handleDialogOpenChange = (newOpen) => {
    if (newOpen && item) {
      // PostHog: Track media detail dialog opened
      posthog.capture("media_detail_dialog_opened", {
        item_id: item.id,
        item_title: getTitle(item),
        media_type: mediaType,
        vote_average: item.vote_average,
        release_year: getDate(item)?.slice(0, 4),
      });
    }
    onOpenChange(newOpen);
  };

  if (!item) return null;

  const detailLink = linkPrefix
    ? `${linkPrefix}/${item.id}`
    : `/${isTV ? "tv" : "movie"}/${item.id}`;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="lg:max-w-6xl max-lg:max-w-none p-0 border-none bg-[#141414] rounded-lg shadow-2xl max-h-[90vh]">
        <DialogTitle className="sr-only">
          {getTitle(item)} - Details
        </DialogTitle>

        <div className="relative">
          <div className="relative h-[40vh] lg:h-[60vh] overflow-hidden rounded-t-lg">
            {showTrailer && trailer ? (
              <div className="absolute inset-0 overflow-hidden">
                <iframe
                  id="media-dialog-trailer"
                  src={`https://www.youtube.com/embed/${trailer}?autoplay=1&mute=1&loop=1&playlist=${trailer}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&cc_load_policy=0&autohide=1&enablejsapi=1`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media"
                  style={{
                    border: "none",
                    pointerEvents: "none",
                    transform: "scale(1.5)",
                    objectFit: "cover",
                  }}
                ></iframe>
              </div>
            ) : (
              <img
                src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                alt="Backdrop"
                className="w-full h-full object-cover object-center"
              />
            )}

            <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-[#141414]/40 to-transparent"></div>
            <div className="absolute inset-0 bg-linear-to-r from-[#141414]/60 via-transparent to-transparent"></div>

            <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8 space-y-3 lg:space-y-4">
              {logo ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${logo}`}
                  alt={getTitle(item)}
                  className="max-w-55 lg:max-w-md max-h-16 lg:max-h-24 object-contain drop-shadow-2xl"
                />
              ) : (
                <h2 className="text-xl lg:text-3xl font-bold text-white drop-shadow-lg">
                  {getTitle(item)}
                </h2>
              )}

              <div className="flex items-center gap-3">
                <Link
                  href={detailLink}
                  onClick={handleWatchNowClick}
                  className="inline-flex gap-2 items-center px-5 lg:px-10 py-2 lg:py-3 bg-white text-black rounded font-semibold hover:bg-white/90 transition-all hover:scale-105 shadow-lg text-sm lg:text-base"
                >
                  <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-black" />
                  <span>Watch Now</span>
                </Link>
                <Link
                  href={detailLink}
                  onClick={handleNavigationClick}
                  className="inline-flex gap-2 items-center px-4 lg:px-10 py-2 lg:py-3 bg-white/20 hover:bg-white/30 text-white rounded font-semibold transition-all border border-white/10 text-sm lg:text-base"
                >
                  <InfoIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span>More Info</span>
                </Link>
              </div>
            </div>

            {/* Mute button */}
            {showTrailer && trailer && (
              <button
                onClick={handleMuteToggle}
                className="absolute bottom-5 right-5 lg:bottom-8 lg:right-8 z-20 p-2 lg:p-2.5 rounded-full border border-white/40 hover:border-white bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all hover:scale-110"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" />
                ) : (
                  <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="px-5 lg:px-8 py-5 lg:py-6 space-y-5 pb-6">
          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            <span className="text-green-400 font-bold text-sm">
              {Math.floor(item.vote_average * 10)}% Match
            </span>
            <span className="text-white/70 text-sm">
              {getDate(item)?.slice(0, 4)}
            </span>
            {itemDetails?.runtime && (
              <span className="text-white/70 text-sm">
                {Math.floor(itemDetails.runtime / 60)}h{" "}
                {itemDetails.runtime % 60}m
              </span>
            )}
            {itemDetails?.number_of_seasons && (
              <span className="text-white/70 text-sm">
                {itemDetails.number_of_seasons}{" "}
                {itemDetails.number_of_seasons > 1 ? "Seasons" : "Season"}
              </span>
            )}
            <span className="px-1.5 py-0.5 border border-white/30 text-white/70 text-xs rounded">
              HD
            </span>
          </div>

          <div className="grid lg:grid-cols-3 gap-5 lg:gap-6">
            {/* Main content - Overview */}
            <div className="lg:col-span-2">
              <p className="text-white/90 text-sm lg:text-base leading-relaxed">
                {item.overview}
              </p>
            </div>

            {/* Sidebar - Cast & Genres */}
            <div className="lg:col-span-1 space-y-3 text-sm">
              {/* Cast */}
              {credits?.data?.cast && credits.data.cast.length > 0 && (
                <div>
                  <span className="text-white/50">Cast: </span>
                  <span className="text-white/90">
                    {credits.data.cast.slice(0, 4).map((actor, i) => (
                      <span key={actor.id}>
                        <Link
                          href={`/person/${actor.id}`}
                          onClick={() => {
                            handleNavigationClick();
                            onOpenChange(false);
                          }}
                          className="hover:underline"
                        >
                          {actor.name}
                        </Link>
                        {i < Math.min(credits.data.cast.length - 1, 3) && ", "}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {/* Genres */}
              {item.genre_ids && item.genre_ids.length > 0 && (
                <div>
                  <span className="text-white/50">Genres: </span>
                  <span className="text-white/90">
                    {getGenres(item.genre_ids).map((genre, i) => (
                      <span key={genre.id}>
                        <Link
                          href={`/genre/${genre.id}`}
                          onClick={() => {
                            handleNavigationClick();
                            onOpenChange(false);
                          }}
                          className="hover:underline"
                        >
                          {genre.name}
                        </Link>
                        {i < getGenres(item.genre_ids).length - 1 && ", "}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {/* Director / Creator */}
              {credits?.data?.crew?.find((c) => c.job === "Director") && (
                <div>
                  <span className="text-white/50">Director: </span>
                  <Link
                    href={`/person/${
                      credits.data.crew.find((c) => c.job === "Director").id
                    }`}
                    onClick={() => {
                      handleNavigationClick();
                      onOpenChange(false);
                    }}
                    className="text-white/90 hover:underline"
                  >
                    {credits.data.crew.find((c) => c.job === "Director").name}
                  </Link>
                </div>
              )}
              {itemDetails?.created_by?.length > 0 && (
                <div>
                  <span className="text-white/50">Created by: </span>
                  <span className="text-white/90">
                    {itemDetails.created_by
                      .slice(0, 2)
                      .map((c) => c.name)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {isTV && seasons.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Episodes</h3>

                <div className="relative">
                  <button
                    onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded text-sm font-medium transition-colors"
                  >
                    <span>Season {selectedSeason}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        showSeasonDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showSeasonDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-44 bg-[#1a1a1a] border border-white/10 rounded shadow-xl z-50 max-h-60 overflow-y-auto">
                      {seasons.map((season) => (
                        <button
                          key={season.id}
                          onClick={() => {
                            setSelectedSeason(season.season_number);
                            setShowSeasonDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center justify-between ${
                            selectedSeason === season.season_number
                              ? "bg-white/10 text-white"
                              : "text-white/80"
                          }`}
                        >
                          <span>Season {season.season_number}</span>
                          <span className="text-xs opacity-60">
                            {season.episode_count} eps
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {loadingEpisodes ? (
                  [...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-3 animate-pulse border-b border-white/10"
                    >
                      <div className="w-8 h-4 bg-white/10 rounded"></div>
                      <div className="w-36 lg:w-56 h-20 lg:h-28 bg-white/10 rounded shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                        <div className="h-3 w-full bg-white/10 rounded"></div>
                      </div>
                      <div className="w-12 h-4 bg-white/10 rounded"></div>
                    </div>
                  ))
                ) : episodes.length > 0 ? (
                  episodes.map((episode, index) => (
                    <div
                      key={episode.id}
                      className="flex items-center gap-3 lg:gap-6 px-6 py-3 rounded hover:bg-white/5 transition-all group cursor-pointer border-b border-white/10 last:border-0"
                    >
                      <div className="text-xl lg:text-2xl font-semibold text-white w-6 lg:w-8 text-center shrink-0">
                        {episode.episode_number}
                      </div>

                      <div className="relative w-36 lg:w-56 h-20 lg:h-28 bg-white/10 rounded overflow-hidden shrink-0">
                        {episode.still_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                            alt={episode.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30">
                            <Play className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base lg:text-lg text-white mb-1 group-hover:text-white/90">
                          {episode.name}
                        </h4>
                        {episode.overview && (
                          <p className="text-xs lg:text-sm text-white/60 line-clamp-2 leading-relaxed">
                            {episode.overview}
                          </p>
                        )}
                      </div>

                      {episode.runtime && (
                        <div className="text-sm lg:text-xl text-white font-semibold shrink-0 w-12 lg:w-16 text-right">
                          {episode.runtime}m
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/50 py-6 text-center">
                    No episodes available
                  </p>
                )}
              </div>
            </div>
          )}

          {recommendations?.results && recommendations.results.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-white/10">
              <h3 className="text-lg lg:text-xl font-bold text-white">
                More Like This
              </h3>

              <div className="flex items-center gap-3 lg:gap-4 overflow-x-auto py-3 pb-2 snap-x scrollbar-hide">
                {recommendations.results.slice(0, 15).map((rec, index) => (
                  <div
                    key={`${rec.id}-${index}`}
                    onClick={() => {
                      posthog.capture("recommendation_clicked", {
                        recommendation_id: rec.id,
                        recommendation_title: getTitle(rec),
                        source_item_id: item.id,
                        source_item_title: getTitle(item),
                        media_type: mediaType,
                      });
                      window.location.href = `/${mediaType}/${rec.id}`;
                    }}
                    className="relative group shrink-0 lg:w-64 w-48 snap-start cursor-pointer"
                  >
                    <div className="relative rounded overflow-hidden bg-white/5 transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-2xl">
                      <img
                        src={
                          rec.poster_path
                            ? `https://image.tmdb.org/t/p/w500${rec.poster_path}`
                            : "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=60"
                        }
                        alt={getTitle(rec)}
                        className="w-full aspect-2/3 object-cover object-center rounded"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
