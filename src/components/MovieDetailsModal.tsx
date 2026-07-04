"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Play, Volume2, VolumeX, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import WatchModal from "./WatchModal";
import { fetchJson } from "@/lib/client-api";
import { recordTaste, TASTE_WEIGHT } from "@/lib/taste";

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 53: "Thriller",
  10752: "War", 37: "Western",
};

interface Movie {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  genre_ids: number[];
  vote_average: number;
  release_date: string;
}

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface ModalData {
  logo: string | null;
  trailerKey: string | null;
  runtime: number | null;
  cast: { id: number; name: string; character: string; profile_path: string | null }[];
  director: string | null;
  directorId: number | null;
}

interface Rec {
  id: number;
  title: string;
  poster_path: string | null;
}

interface Props {
  movie: Movie;
  providers?: WatchProvider[];
  onClose: () => void;
}

export default function MovieDetailsModal({ movie, providers = [], onClose }: Props) {
  /* Feed the on-device taste profile — opening details is browse intent. */
  useEffect(() => {
    recordTaste(
      {
        id: movie.id,
        media_type: "movie",
        title: movie.title,
        backdrop_path: movie.backdrop_path,
        genre_ids: movie.genre_ids,
      },
      TASTE_WEIGHT.browse,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id]);

  const [data, setData]             = useState<ModalData | null>(null);
  const [recs, setRecs]             = useState<Rec[]>([]);
  const [showVideo, setShowVideo]   = useState(false);
  const [muted, setMuted]           = useState(true);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const iframeRef                   = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetchJson(`/api/getMovieDetailsEnhanced?id=${movie.id}`)
      .then(res => {
        const crew: { id: number; job: string; name: string }[] = res.credits?.crew ?? [];
        const dir = crew.find(c => c.job === "Director") ?? null;
        setData({
          logo:       res.logo ?? null,
          trailerKey: res.trailerKey ?? null,
          runtime:    res.data?.runtime ?? null,
          cast:       (res.credits?.cast ?? []).slice(0, 8),
          director:   dir?.name ?? null,
          directorId: dir?.id ?? null,
        });
      })
      .catch(() => setData({ logo: null, trailerKey: null, runtime: null, cast: [], director: null, directorId: null }));
  }, [movie.id]);

  useEffect(() => {
    fetchJson(`/api/getMovieRecommendations?id=${movie.id}`)
      .then(res => setRecs(res.results ?? []))
      .catch(() => {});
  }, [movie.id]);

  /* ── video reveal — wait until the trailer key is known, then run the 6s
        countdown so the progress ring and the reveal stay in sync ── */
  useEffect(() => {
    if (!data?.trailerKey) return;
    const t = setTimeout(() => setShowVideo(true), 6000);
    return () => clearTimeout(t);
  }, [data?.trailerKey]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const toggleMute = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: muted ? "unMute" : "mute", args: "" }), "*",
    );
    setMuted(m => !m);
  };

  const genres = movie.genre_ids.slice(0, 4).map(id => ({ id, name: GENRE_MAP[id] })).filter(g => g.name);
  const year   = movie.release_date?.slice(0, 4);
  const rt     = data?.runtime;
  const rtStr  = rt ? `${Math.floor(rt / 60)}h ${rt % 60}m` : null;
  const tKey   = data?.trailerKey;
  const tSrc   = tKey
    ? `https://www.youtube.com/embed/${tKey}?autoplay=1&mute=1&loop=1&playlist=${tKey}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&enablejsapi=1&vq=hd1080`
    : null;

  return (
    <>
    <div
      className="fixed inset-0 z-[200] overflow-y-auto scrollbar-hide"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex min-h-full items-start justify-center px-4 py-8 md:px-8 md:py-12" onClick={onClose}>
        <div
          className="relative w-full max-w-[900px] overflow-hidden bg-[#0e0e0e] shadow-[0_32px_96px_rgba(0,0,0,0.95)]"
          style={{ animation: "fade-in-up 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── Close (top-right) ── */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-7 top-5 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-white/[0.16] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] md:right-10 md:top-6"
          >
            <X className="h-[15px] w-[15px]" />
          </button>

          {/* ── Hero backdrop / trailer ── */}
          <div className="relative w-full overflow-hidden" style={{ height: "clamp(260px, 50vh, 58vh)" }}>
            <img
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
              alt=""
              aria-hidden
              className="h-full w-full object-cover"
            />

            {tSrc && (
              <div className={cn(
                "absolute inset-0",
                showVideo ? "animate-trailer-reveal" : "opacity-0",
              )}>
                <iframe
                  ref={iframeRef}
                  src={tSrc}
                  allow="autoplay; encrypted-media"
                  className="absolute inset-0 h-full w-full"
                  style={{ border: "none", pointerEvents: "none", transform: "scale(1.28)" }}
                />
                <div className="absolute inset-0 z-10 bg-transparent" />
              </div>
            )}

            {/* Gradient overlays */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to top, #0e0e0e 0%, rgba(14,14,14,0.65) 38%, transparent 68%)",
              }} />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 22%)",
              }} />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to right, rgba(14,14,14,0.35) 0%, transparent 50%)",
              }} />
            </div>

            {/* Logo + actions */}
            <div className="absolute bottom-0 left-0 right-0 px-7 pb-7 md:px-10 md:pb-8">
              {data?.logo ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${data.logo}`}
                  alt={movie.title}
                  className="mb-5 max-h-[64px] max-w-[260px] object-contain drop-shadow-[0_2px_28px_rgba(0,0,0,0.98)]"
                />
              ) : data !== null ? (
                <h2 className="mb-5 font-nichrome text-[2.1rem] font-black leading-none text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] uppercase tracking-tight">
                  {movie.title}
                </h2>
              ) : (
                <div className="mb-5 h-12 w-52 animate-pulse rounded-lg bg-white/[0.07]" />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowWatchModal(true)}
                  className="flex h-10 items-center gap-[7px] rounded-full bg-white px-6 font-manrope text-[15px] font-bold tracking-[0.01em] text-black transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_32px_rgba(255,255,255,0.22)]"
                >
                  <Play className="h-[13px] w-[13px] fill-black" />
                  Watch Now
                </button>

                <Link
                  href={`/movie/${movie.id}`}
                  onClick={onClose}
                  aria-label="More info"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-white/[0.16] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]"
                >
                  <Info className="h-[17px] w-[17px]" />
                </Link>

                {tKey && (
                  <>
                    {!showVideo ? (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-md">
                        <svg className="h-[22px] w-[22px] -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
                          <circle
                            cx="18" cy="18" r="15" fill="none" stroke="var(--color-brand, #e50914)" strokeWidth="2.5"
                            strokeLinecap="round" strokeDasharray="94.25" strokeDashoffset="94.25"
                            style={{ animation: `showreel-circle 6000ms linear forwards` }}
                          />
                        </svg>
                        <style>{`
                          @keyframes showreel-circle {
                            from { stroke-dashoffset: 94.25; }
                            to { stroke-dashoffset: 0; }
                          }
                        `}</style>
                      </div>
                    ) : (
                      <button
                        onClick={toggleMute}
                        aria-label={muted ? "Unmute" : "Mute"}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-white/[0.16] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]"
                      >
                        {muted ? <VolumeX className="h-[17px] w-[17px]" /> : <Volume2 className="h-[17px] w-[17px]" />}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="px-7 pb-10 pt-6 md:px-10 md:pb-12 md:pt-7">

            {/* Meta strip */}
            <div className="mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span className="font-space text-[14px] font-semibold text-[#4ade80]">★ {movie.vote_average.toFixed(1)}</span>
              {year && (
                <>
                  <span className="text-white/[0.18]">·</span>
                  <span className="font-space text-[14px] text-neutral-400">{year}</span>
                </>
              )}
              {rtStr && (
                <>
                  <span className="text-white/[0.18]">·</span>
                  <span className="font-space text-[14px] text-neutral-400">{rtStr}</span>
                </>
              )}
              <span className="ml-1 flex items-center justify-center rounded-[4px] border border-white/20 bg-white/[0.05] px-1.5 py-[2px] font-space text-[10px] font-bold tracking-[0.15em] text-neutral-300 shadow-sm backdrop-blur-md">
                HD
              </span>
              {providers.length > 0 && (
                <>
                  <span className="mx-1 text-white/[0.18]">·</span>
                  <div className="flex items-center gap-1.5">
                    {providers.slice(0, 5).map(p => (
                      <div
                        key={p.provider_id}
                        title={p.provider_name}
                        className="h-[26px] w-[26px] overflow-hidden rounded-[5px] opacity-80"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                          alt={p.provider_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Overview */}
            <p className="mb-6 text-[15px] leading-[1.85] text-neutral-300">{movie.overview}</p>

            {/* Director / Starring / Genres */}
            <div className="mb-7 flex flex-col gap-3.5">
              {data?.cast && data.cast.length > 0 && (
                <div className="flex items-start gap-4">
                  <span className="w-[76px] shrink-0 pt-[5px] font-manrope text-[10px] font-bold uppercase tracking-widest text-neutral-600">Starring</span>
                  <p className="leading-relaxed text-[15px] text-neutral-300">
                    {data.cast.slice(0, 5).map((c, i) => (
                      <span key={c.id}>
                        {i > 0 && <span className="text-neutral-700">, </span>}
                        <Link href={`/person/${c.id}`} onClick={onClose} className="transition-all duration-200 hover:text-white hover:underline hover:decoration-white/30 underline-offset-4">
                          {c.name}
                        </Link>
                      </span>
                    ))}
                  </p>
                </div>
              )}
              {data?.director && (
                <div className="flex items-start gap-4">
                  <span className="w-[76px] shrink-0 pt-[5px] font-manrope text-[10px] font-bold uppercase tracking-widest text-neutral-600">Director</span>
                  <p className="leading-relaxed text-[15px] text-neutral-300">
                    {data.directorId
                      ? <Link href={`/person/${data.directorId}`} onClick={onClose} className="transition-all duration-200 hover:text-white hover:underline hover:decoration-white/30 underline-offset-4">{data.director}</Link>
                      : <span>{data.director}</span>
                    }
                  </p>
                </div>
              )}
              {genres.length > 0 && (
                <div className="flex items-start gap-4">
                  <span className="w-[76px] shrink-0 pt-[5px] font-manrope text-[10px] font-bold uppercase tracking-widest text-neutral-600">Genres</span>
                  <p className="leading-relaxed text-[15px] text-neutral-300">
                    {genres.map((g, i) => (
                      <span key={g.id}>
                        {i > 0 && <span className="text-neutral-700">, </span>}
                        <Link href={`/movie?genre=${g.id}`} onClick={onClose} className="transition-all duration-200 hover:text-white hover:underline hover:decoration-white/30 underline-offset-4">{g.name}</Link>
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>


            {/* Recommendations */}
            {recs.length > 0 && (
              <div className="mt-8 border-t border-white/[0.07] pt-7">
                <p className="mb-4 font-manrope text-[10px] uppercase tracking-[0.22em] text-neutral-500">More Like This</p>
                <div className="grid grid-cols-3 sm:grid-cols-4">
                  {recs.slice(0, 8).map(r => (
                    <Link
                      key={r.id}
                      href={`/movie/${r.id}`}
                      onClick={onClose}
                      className="group relative aspect-[2/3] overflow-hidden bg-neutral-900"
                    >
                      {r.poster_path
                        ? <img
                            src={`https://image.tmdb.org/t/p/w342${r.poster_path}`}
                            alt={r.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                          />
                        : <div className="flex h-full w-full items-center justify-center font-manrope text-[11px] text-neutral-600">{r.title[0]}</div>
                      }
                      <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Loading skeleton for data */}
            {!data && (
              <div className="space-y-3 pt-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-4 w-full animate-pulse rounded bg-white/[0.06]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {showWatchModal && (
      <WatchModal
        movie={movie}
        logo={data?.logo}
        runtimeLabel={rtStr}
        genres={genres}
        onClose={() => setShowWatchModal(false)}
      />
    )}
    </>
  );
}
