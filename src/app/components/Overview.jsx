"use client";

import { Play, Volume2, VolumeX, Info, Clock } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const genresById = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

export default function Overview() {
  const [data, setData] = useState(null);
  const [enriched, setEnriched] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [dialogDetails, setDialogDetails] = useState(null);
  const [dialogCredits, setDialogCredits] = useState(null);
  const [currentMovieId, setCurrentMovieId] = useState(null);
  const [progressKey, setProgressKey] = useState(0);
  const [dialogPlay, setDialogPlay] = useState(false);

  useEffect(() => {
    fetch("/api/getMovieList?list=now_playing&page=1")
      .then((r) => r.json())
      .then((result) => setData(result.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!data) return;
    data.results.slice(0, 8).forEach(async ({ id }) => {
      try {
        const result = await fetch(`/api/getMovieDetailsEnhanced?id=${id}`).then((r) => r.json());
        setEnriched((prev) => ({
          ...prev,
          [id]: {
            logo: result.logo || null,
            logoFetched: true,
            trailerKey: result.trailer?.key || null,
            cast: result.credits?.cast?.slice(0, 4) || [],
            runtime: result.data?.runtime || null,
          },
        }));
      } catch {
        setEnriched((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), logoFetched: true } }));
      }
    });
  }, [data]);

  useEffect(() => {
    if (!open || !currentMovieId) {
      setDialogDetails(null);
      setDialogCredits(null);
      return;
    }
    fetch(`/api/getMovieDetailsEnhanced?id=${currentMovieId}`)
      .then((r) => r.json())
      .then((result) => {
        setDialogDetails(result.data);
        if (result.credits) setDialogCredits(result.credits);
      })
      .catch(console.error);
  }, [open, currentMovieId]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.getElementsByTagName("script")[0].before(tag);
    }
  }, []);

  useEffect(() => {
    if (!open) { setShowTrailer(false); setDialogPlay(false); return; }
    setShowTrailer(false);
    setIsMuted(true);
    const t = setTimeout(() => setShowTrailer(true), 3000);
    return () => clearTimeout(t);
  }, [open]);

  const totalPages = data ? Math.min(data.results?.length, 8) : 0;

  useEffect(() => {
    if (open || !totalPages) return;
    setProgressKey((k) => k + 1);
    const interval = setInterval(() => setCurrentPage((p) => (p + 1) % totalPages), 15000);
    return () => clearInterval(interval);
  }, [currentPage, totalPages, open]);

  const changePage = (page) => {
    setCurrentPage(page);
    setProgressKey((k) => k + 1);
  };

  const handleMuteToggle = () => {
    const iframe = document.querySelector('iframe[src*="youtube"]');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        isMuted
          ? '{"event":"command","func":"unMute","args":""}'
          : '{"event":"command","func":"mute","args":""}',
        "*"
      );
      setIsMuted((m) => !m);
    }
  };

  const handleOpenDialog = (movieId) => {
    setCurrentMovieId(movieId);
    setOpen(true);
  };

  const getGenreNames = (ids) =>
    ids.slice(0, 3).map((id) => genresById[id]).filter(Boolean);

  const getGenres = (ids) =>
    ids.map((id) => ({ id, name: genresById[id] })).filter((g) => g.name);

  if (!data) {
    return (
      <section className="relative h-screen bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent animate-pulse" />
        <div className="absolute bottom-28 left-14 space-y-5">
          <div className="h-36 w-80 rounded-xl bg-white/10 animate-pulse" />
          <div className="h-3 w-56 rounded-full bg-white/6 animate-pulse" />
          <div className="h-3 w-96 rounded-full bg-white/5 animate-pulse" />
          <div className="h-3 w-80 rounded-full bg-white/5 animate-pulse" />
          <div className="h-3 w-64 rounded-full bg-white/4 animate-pulse" />
          <div className="flex gap-3 pt-2">
            <div className="h-12 w-36 rounded bg-white/12 animate-pulse" />
            <div className="h-12 w-36 rounded bg-white/6 animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  return data.results.slice(currentPage, currentPage + 1).map((item) => {
    const info = enriched[item.id] || {};
    const trailerKey = info.trailerKey;
    const genreNames = getGenreNames(item.genre_ids);

    return (
      <main key={item.id} className="relative">

        {/* ── DESKTOP ─────────────────────────────────────────── */}
        <section className="hidden lg:block">

          {/* Backdrop */}
          <div className="absolute top-0 inset-0 overflow-hidden">
            <img
              src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
              alt={item.title}
              className="w-full h-full object-cover object-top"
              style={{ animation: "kenburns 22s ease-in-out infinite alternate" }}
            />
            {/* Film grain */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize: "180px 180px",
              }}
            />
            {/* Gradients */}
            <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/20 to-[#010101] via-60%" />
            <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/40 to-transparent via-50%" />
            <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-transparent to-transparent opacity-90" />
          </div>

          <div className="h-screen relative flex items-center">
            <div className="absolute z-30 inset-x-12 bottom-12 flex items-end justify-between gap-8">

              {/* ── LEFT: content ── */}
              <div className="space-y-5 max-w-xl animate-[fadeInUp_0.8s_ease-out]">

                {/* Logo / skeleton / title */}
                <div className="mb-8">
                  {info.logo ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${info.logo}`}
                      alt={item.title}
                      className="w-auto max-h-48 object-contain drop-shadow-[0_4px_28px_rgba(0,0,0,0.9)]"
                      style={{ animation: "fadeIn 0.6s ease-out forwards" }}
                    />
                  ) : !info.logoFetched ? (
                    <div className="h-36 w-80 rounded-lg animate-pulse bg-white/10" />
                  ) : (
                    <h1 className="text-5xl font-bold text-white leading-[0.95] drop-shadow-2xl">
                      {item.title}
                    </h1>
                  )}
                </div>

                {/* Genre + stats row */}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 font-medium text-sm drop-shadow-md">
                  {genreNames.length > 0 && (
                    <>
                      <span className="text-white/50 text-xs uppercase tracking-[0.15em]">
                        {genreNames.join(" · ")}
                      </span>
                      <span className="text-white/25">|</span>
                    </>
                  )}
                  <span className="text-[#46d369] font-bold text-base">
                    {Math.floor(item.vote_average * 10)}% Match
                  </span>
                  <span className="text-white/25">|</span>
                  <span className="text-white/70">{item.release_date?.slice(0, 4)}</span>
                  {info.runtime && (
                    <>
                      <span className="text-white/25">|</span>
                      <span className="text-white/65 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 opacity-60" />
                        {Math.floor(info.runtime / 60)}h {info.runtime % 60}m
                      </span>
                    </>
                  )}
                  <span className="text-white/25">|</span>
                  <span className="px-2 py-0.5 border border-white/30 rounded text-xs font-semibold uppercase bg-white/5">
                    HD
                  </span>
                </div>

                {/* Overview */}
                <p className="text-base leading-relaxed text-white/75 drop-shadow-lg line-clamp-3 max-w-lg">
                  {item.overview}
                </p>

                {/* Cast */}
                {info.cast?.length > 0 && (
                  <div className="flex items-center gap-4 pt-1">
                    <span className="text-white/28 text-[9px] uppercase tracking-[0.22em] font-semibold shrink-0">
                      Starring
                    </span>
                    <div className="flex items-center gap-3">
                      {info.cast.map((actor) => (
                        <Link
                          key={actor.id}
                          href={`/person/${actor.id}`}
                          className="group flex flex-col items-center gap-1.5"
                          title={actor.name}
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/15 group-hover:ring-white/55 transition-all duration-300 bg-white/10 shrink-0">
                            {actor.profile_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                alt={actor.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-white/30">
                                {actor.name[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-white/32 text-[9px] max-w-[40px] text-center truncate leading-tight group-hover:text-white/65 transition-colors">
                            {actor.name.split(" ")[0]}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buttons — same style as original */}
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
                    <Info className="w-5 h-5" />
                    <span className="text-base font-semibold">More Info</span>
                  </button>
                </div>
              </div>

              {/* ── RIGHT: typographic slide navigator ── */}
              <div className="flex flex-col shrink-0 w-56">

                {/* Counter */}
                <div className="flex items-baseline gap-2 mb-4 select-none">
                  <span className="text-white text-4xl font-bold tabular-nums leading-none tracking-tight">
                    {String(currentPage + 1).padStart(2, "0")}
                  </span>
                  <span className="text-white/20 text-base font-medium tabular-nums">
                    / {String(totalPages).padStart(2, "0")}
                  </span>
                </div>

                {/* Thin rule */}
                <div className="w-8 h-px bg-white/20 mb-4" />

                {/* Title list */}
                <div className="flex flex-col">
                  {data.results.slice(0, totalPages).map((movie, idx) => {
                    const isActive = idx === currentPage;
                    return (
                      <button
                        key={movie.id}
                        onClick={() => changePage(idx)}
                        className={`group flex items-stretch gap-3 py-[9px] text-left transition-opacity duration-400 ${
                          isActive ? "opacity-100" : "opacity-20 hover:opacity-50"
                        }`}
                      >
                        {/* Vertical track */}
                        <div className="w-px bg-white/15 relative self-stretch shrink-0">
                          {isActive && (
                            <div
                              key={progressKey}
                              className="absolute inset-x-0 top-0 bg-white"
                              style={{
                                height: "100%",
                                transformOrigin: "top",
                                transform: "scaleY(0)",
                                animation: "progressScaleV 15s linear forwards",
                              }}
                            />
                          )}
                        </div>

                        {/* Title */}
                        <span
                          className={`text-[13px] leading-snug truncate transition-all duration-300 ${
                            isActive
                              ? "text-white font-semibold"
                              : "text-white font-normal group-hover:text-white"
                          }`}
                        >
                          {movie.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── MOBILE ──────────────────────────────────────────── */}
        <section className="lg:hidden">
          <div className="relative h-64">
            {showTrailer && trailerKey ? (
              <div className="absolute inset-0 overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&loop=1&playlist=${trailerKey}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media"
                  style={{ border: "none", pointerEvents: "none", transform: "scale(1.3)" }}
                />
              </div>
            ) : (
              <img
                src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                alt={item.title}
                className="w-full h-full object-cover object-top"
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-black/20 to-transparent" />
            {showTrailer && trailerKey && (
              <button
                onClick={handleMuteToggle}
                className="absolute bottom-3 right-3 z-20 p-2.5 rounded-full border-2 border-white/60 bg-black/40 backdrop-blur-sm"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="px-4 py-5 space-y-4 bg-[#010101]">
            {info.logo ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${info.logo}`}
                alt={item.title}
                className="max-w-48 max-h-16 object-contain"
                style={{ animation: "fadeIn 0.6s ease-out forwards" }}
              />
            ) : !info.logoFetched ? (
              <div className="h-12 w-48 rounded animate-pulse bg-white/10" />
            ) : (
              <h1 className="text-2xl font-bold text-white leading-tight">{item.title}</h1>
            )}

            <div className="flex items-center gap-3 text-sm font-medium text-white/90">
              <span className="text-[#46d369] font-bold">
                {Math.floor(item.vote_average * 10)}% Match
              </span>
              <span className="text-white/40">•</span>
              <span>{item.release_date?.slice(0, 4)}</span>
              <span className="text-white/40">•</span>
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
                <Info className="w-4 h-4" />
                <span>More Info</span>
              </button>
            </div>

            <p className="text-sm opacity-80 leading-relaxed line-clamp-3 font-light text-white/90">
              {item.overview}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
              <button
                onClick={() => changePage(currentPage > 0 ? currentPage - 1 : totalPages - 1)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                aria-label="Previous"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                onClick={() => changePage(currentPage < totalPages - 1 ? currentPage + 1 : 0)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                aria-label="Next"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── PLAYER DIALOG ───────────────────────────────────── */}
        <Dialog open={dialogPlay} onOpenChange={setDialogPlay}>
          <DialogContent className="lg:max-w-[82vw]! lg:h-[88vh]! w-full h-[55vw] p-0 border-none bg-black">
            <DialogTitle className="sr-only">Now Playing</DialogTitle>
            <iframe
              src={`https://vidsrcme.ru/embed/movie?tmdb=${item.id}`}
              className="w-full h-full"
              allowFullScreen
              style={{ border: "none" }}
            />
          </DialogContent>
        </Dialog>

        {/* ── INFO DIALOG ─────────────────────────────────────── */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="lg:max-w-6xl max-lg:max-w-none p-0 border-none bg-[#010101]">
            <DialogTitle className="sr-only">Movie Details</DialogTitle>

            {/* Backdrop — aspect-ratio height so it scrolls with the rest */}
            <div className="relative aspect-video lg:aspect-[2.4/1] overflow-hidden rounded-t-lg">
              {showTrailer && trailerKey ? (
                <div className="absolute inset-0">
                  <iframe
                    id="overview-trailer-player"
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&loop=1&playlist=${trailerKey}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&enablejsapi=1`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media"
                    style={{ border: "none", pointerEvents: "none", transform: "scale(1.4)" }}
                  />
                </div>
              ) : (
                <img
                  src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                  alt={item.title}
                  className="w-full h-full object-cover object-top"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-r from-[#010101]/60 via-transparent to-transparent" />

              {/* Logo + buttons */}
              <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8 space-y-3 lg:space-y-4">
                {info.logo ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${info.logo}`}
                    alt={item.title}
                    className="max-w-40 lg:max-w-md max-h-14 lg:max-h-24 object-contain"
                    style={{ animation: "fadeIn 0.6s ease-out forwards" }}
                  />
                ) : !info.logoFetched ? (
                  <div className="h-8 w-36 lg:h-16 lg:w-72 animate-pulse rounded-lg bg-white/10" />
                ) : (
                  <h2 className="text-xl lg:text-2xl font-bold text-white">{item.title}</h2>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDialogPlay(true)}
                    className="inline-flex gap-2 items-center px-5 lg:px-8 py-2 lg:py-3 bg-white text-black rounded font-semibold hover:bg-white/90 transition-all active:scale-95 text-sm lg:text-base"
                  >
                    <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-black" />
                    <span>Watch Now</span>
                  </button>
                  <Link
                    href={`/movie/${item.id}`}
                    onClick={() => setOpen(false)}
                    className="inline-flex gap-2 items-center px-5 lg:px-8 py-2 lg:py-3 bg-white/20 text-white rounded font-semibold hover:bg-white/30 backdrop-blur-md transition-all active:scale-95 text-sm lg:text-base"
                  >
                    <Info className="w-4 h-4 lg:w-5 lg:h-5" />
                    <span>More Info</span>
                  </Link>
                </div>
              </div>

              {showTrailer && trailerKey && (
                <button
                  onClick={handleMuteToggle}
                  className="absolute bottom-5 right-5 lg:bottom-8 lg:right-8 z-20 p-2 lg:p-2.5 rounded-full border border-white/40 hover:border-white bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" /> : <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" />}
                </button>
              )}
            </div>

            {/* Details */}
            <div className="px-5 lg:px-8 py-5 lg:py-6 space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-green-500 font-semibold">
                  {Math.floor(item.vote_average * 10)}% Match
                </span>
                <span className="opacity-80">{item.release_date?.slice(0, 4)}</span>
                {dialogDetails?.runtime && (
                  <span className="opacity-80 border border-white/20 px-2 py-0.5 rounded text-xs">
                    {Math.floor(dialogDetails.runtime / 60)}h {dialogDetails.runtime % 60}m
                  </span>
                )}
                <span className="opacity-60 text-xs">
                  ⭐ {item.vote_average?.toFixed(1)} ({item.vote_count?.toLocaleString()} votes)
                </span>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <p className="text-sm lg:text-base leading-relaxed opacity-90">{item.overview}</p>

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

                  <div className="space-y-1.5 text-sm opacity-80">
                    {dialogCredits?.crew?.find((c) => c.job === "Director") && (
                      <p>
                        <span className="opacity-60">Director: </span>
                        <Link
                          href={`/person/${dialogCredits.crew.find((c) => c.job === "Director").id}`}
                          onClick={() => setOpen(false)}
                          className="hover:underline"
                        >
                          {dialogCredits.crew.find((c) => c.job === "Director").name}
                        </Link>
                      </p>
                    )}
                    {dialogDetails?.production_companies?.length > 0 && (
                      <p>
                        <span className="opacity-60">Studio: </span>
                        {dialogDetails.production_companies.slice(0, 2).map((c) => c.name).join(", ")}
                      </p>
                    )}
                    {dialogDetails?.spoken_languages?.length > 0 && (
                      <p>
                        <span className="opacity-60">Language: </span>
                        {dialogDetails.spoken_languages[0]?.english_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-3">
                  <h3 className="text-base font-bold">Top Cast</h3>
                  <div className="space-y-3">
                    {dialogCredits?.cast?.slice(0, 6).map((actor) => (
                      <Link
                        key={actor.id}
                        href={`/person/${actor.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 group"
                      >
                        <div className="relative rounded-full overflow-hidden w-9 h-9 shrink-0 bg-white/10">
                          {actor.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                              alt={actor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm opacity-50">
                              👤
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate group-hover:text-white/80">
                            {actor.name}
                          </p>
                          <p className="text-xs opacity-50 truncate">{actor.character}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </main>
    );
  });
}
