"use client";

import { useTrailerGuard } from "@/lib/trailer-guard";
import { useTrailerLayout } from "@/lib/useTrailerLayout";
import { youtubeEmbedUrl } from "@/lib/youtube";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Play, Info, Star, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import BlurImage from "@/components/BlurImage";
import WatchModal, { type OriginRect } from "@/components/WatchModal";
import TvWatchModal from "@/components/TvWatchModal";
import { fetchJson } from "@/lib/client-api";
import { useInView } from "@/lib/useInView";
import { GENRE_NAMES } from "@/lib/genres";

/* ── Spotlight ─────────────────────────────────────────────────────────────
   The editorial counterpart to MediaGrid. Where the grid is dense, silent
   and anonymous — twelve posters, no context — a spotlight section gives its
   whole width to ONE title: logo art, pitch, cast, providers, a trailer worth
   waiting for. The other picks live in a filmstrip rail beside it and swap
   into the frame on click.

   Deliberately cheap where the old reel was not: one trailer iframe per
   section instead of one per card, and detail enrichment only for the title
   currently in the frame (plus the one on deck), rather than a twelve-wide
   fan-out the moment the section scrolls near. */

const SLIDE_MS = 9000;
/* Short enough that a normal glance-and-hover actually reaches the payoff.
   The old reel waited 3.6s, which almost nobody sat through. */
const HOVER_TRAILER_MS = 900;
const MAX_PICKS = 5;

interface CastMember {
  id: number;
  name: string;
  profile_path: string | null;
}

interface Season {
  season_number: number;
  episode_count: number;
  name: string;
}

interface Item {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  poster_path: string | null;
  year: string;
  date: string;
  genres: { id: number; name: string }[];
  vote_average: number;
  media_type: "movie" | "tv";
}

interface Enriched {
  logo: string | null;
  logoFetched: boolean;
  trailerKey: string | null;
  runtime: number | null;
  seasonCount: number | null;
  seasons: Season[];
  cast: CastMember[];
}

interface RawResult {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path: string | null;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  media_type?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  fetchUrl: string;
  limit?: number;
  mediaType?: "movie" | "tv";
  /* Hide these ids — used by personalized sections to skip titles the user
     has already interacted with. */
  excludeIds?: number[];
}

export default function Spotlight({
  title,
  subtitle,
  fetchUrl,
  limit = MAX_PICKS,
  mediaType,
  excludeIds,
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [enriched, setEnriched] = useState<Record<number, Enriched>>({});
  const [paused, setPaused] = useState(false);
  const [showWatch, setShowWatch] = useState(false);
  const [trailerOn, setTrailerOn] = useState(false);
  const [muted, setMuted] = useState(true);
  const [originRect, setOriginRect] = useState<OriginRect | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const trailerLayout = useTrailerLayout();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Defer the fetch until the section approaches the viewport. */
  const { ref, inView } = useInView();
  const excludeKey = (excludeIds ?? []).join(",");

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const exclude = new Set(
      excludeKey ? excludeKey.split(",").map(Number) : [],
    );

    fetchJson(fetchUrl)
      .then((d) => {
        const raw: RawResult[] = d.results ?? d.data?.results ?? [];
        const picks = raw
          .filter((m) => m.backdrop_path && !exclude.has(m.id))
          .slice(0, Math.min(limit, MAX_PICKS))
          .map((m): Item => {
            const type = (m.media_type as "movie" | "tv") ?? mediaType ?? "movie";
            const date = m.release_date ?? m.first_air_date ?? "";
            return {
              id: m.id,
              title: m.title ?? m.name ?? "",
              overview: m.overview ?? "",
              backdrop_path: m.backdrop_path as string,
              poster_path: m.poster_path,
              year: date.slice(0, 4),
              date,
              genres: (m.genre_ids ?? [])
                .slice(0, 3)
                .map((id) => ({ id, name: GENRE_NAMES[String(id)] }))
                .filter((g): g is { id: number; name: string } => Boolean(g.name)),
              vote_average: m.vote_average ?? 0,
              media_type: type,
            };
          });
        if (!cancelled) setItems(picks);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchUrl, limit, mediaType, inView, excludeKey]);

  /* ── Enrichment — logo, trailer, cast, runtime ──
     Only the framed title and the one on deck, so a section costs two
     requests however many picks it holds. fetchJson memoizes per URL, so
     stepping back through the rail is free. */
  const requested = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!items.length) return;
    const targets = [items[idx], items[(idx + 1) % items.length]].filter(
      (t): t is Item => Boolean(t) && !requested.current.has(t.id),
    );
    targets.forEach(({ id, media_type }) => {
      requested.current.add(id);
      const endpoint =
        media_type === "tv" ? "getTvDetailsEnhanced" : "getMovieDetailsEnhanced";
      fetchJson(`/api/${endpoint}?id=${id}`)
        .then((res) =>
          setEnriched((p) => ({
            ...p,
            [id]: {
              logo: res.logo ?? null,
              logoFetched: true,
              trailerKey: res.trailerKey ?? null,
              runtime:
                media_type === "tv"
                  ? (res.data?.episode_run_time?.[0] ?? null)
                  : (res.data?.runtime ?? null),
              seasonCount:
                media_type === "tv" ? (res.data?.number_of_seasons ?? null) : null,
              seasons:
                media_type === "tv"
                  ? (res.data?.seasons ?? []).filter(
                      (s: Season) => s.season_number >= 1,
                    )
                  : [],
              cast: (res.credits?.cast ?? []).slice(0, 4),
            },
          })),
        )
        .catch(() => {
          requested.current.delete(id);
          setEnriched((p) => ({
            ...p,
            [id]: {
              logo: null,
              logoFetched: true,
              trailerKey: null,
              runtime: null,
              seasonCount: null,
              seasons: [],
              cast: [],
            },
          }));
        });
    });
  }, [items, idx]);

  const goTo = useCallback((i: number) => {
    setIdx(i);
    setTrailerOn(false);
    setMuted(true);
  }, []);

  /* Auto-advance — only while the section is actually on screen and the
     viewer isn't reading it. */
  useEffect(() => {
    if (!inView || paused || showWatch || items.length < 2) return;
    const t = setTimeout(() => goTo((idx + 1) % items.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [inView, paused, showWatch, items.length, idx, goTo]);

  const item = items[idx];
  const info: Partial<Enriched> = item ? (enriched[item.id] ?? {}) : {};

  const handleEnter = useCallback(() => {
    setPaused(true);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setTrailerOn(true), HOVER_TRAILER_MS);
  }, []);

  const handleLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setPaused(false);
    setTrailerOn(false);
    setMuted(true);
  }, []);

  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  const openWatch = () => {
    const r = frameRef.current?.getBoundingClientRect();
    if (r)
      setOriginRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setShowWatch(true);
  };

  const toggleMute = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: muted ? "unMute" : "mute", args: "" }),
      "*",
    );
    setMuted((m) => !m);
  };

  const runtimeLabel =
    item?.media_type === "tv"
      ? info.seasonCount
        ? `${info.seasonCount} Season${info.seasonCount === 1 ? "" : "s"}`
        : null
      : info.runtime
        ? `${Math.floor(info.runtime / 60)}h ${info.runtime % 60}m`
        : null;

  const trailerBlocked = useTrailerGuard(iframeRef, trailerOn && !!trailerLayout, info.trailerKey);
  const trailerSrc = info.trailerKey && !trailerBlocked && trailerLayout
    ? youtubeEmbedUrl(info.trailerKey, true)
    : null;

  /* Nothing came back (thin catalog, failed fetch) — drop the whole section
     rather than strand an empty header. */
  if (!loading && items.length === 0) return null;

  const href = item ? `/${item.media_type === "movie" ? "films" : "series"}/${item.id}` : "#";

  return (
    <>
      <div ref={ref} className="snap-section py-12 lg:py-16">
        {/* ── Header ── */}
        <div className="mb-6 px-(--gutter)">
          <div className="mx-auto flex w-full items-center gap-4">
            <div className="h-9 w-1 shrink-0 bg-[#e50914]" />
            <div className="flex flex-col justify-center gap-0.5">
              {subtitle && (
                <span className="font-space text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">
                  {subtitle}
                </span>
              )}
              <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
                {title}
              </h2>
            </div>
          </div>
        </div>

        <div className="px-(--gutter)">
          <div className="mx-auto w-full">
            {loading || !item ? (
              <SpotlightSkeleton />
            ) : (
              <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
                {/* ═══ The frame ═══ */}
                <div
                  ref={frameRef}
                  className="group relative aspect-[16/9] w-full cursor-pointer overflow-hidden border border-white/[0.06] bg-neutral-900 lg:aspect-[2/1] lg:flex-1"
                  onClick={openWatch}
                  onMouseEnter={handleEnter}
                  onMouseLeave={handleLeave}
                >
                  {/* Backdrop — re-keyed per slide so it dissolves in */}
                  <img
                    key={`bg-${item.id}`}
                    src={`https://image.tmdb.org/t/p/w1280${item.backdrop_path}`}
                    alt=""
                    aria-hidden
                    className="animate-cinematic-in absolute inset-0 h-full w-full object-cover"
                  />

                  {/* Trailer — one iframe for the whole section, and only
                      while the viewer is actually dwelling on the frame. */}
                  {trailerSrc && trailerOn && (
                    <div className="animate-trailer-reveal absolute inset-0 overflow-hidden">
                      <iframe
                        referrerPolicy="strict-origin-when-cross-origin"
                        ref={iframeRef}
                        src={trailerSrc}
                        title={`${item.title} trailer`}
                        allow="autoplay; encrypted-media"
                        className="absolute inset-0 h-full w-full border-0"
                        style={{ pointerEvents: "none", transform: "scale(1.45)" }}
                      />
                      {/* Barrier — keeps YouTube from seeing the hover */}
                      <div className="absolute inset-0" />
                    </div>
                  )}

                  {/* Grade — left + bottom falloff so the copy always reads */}
                  <div className="pointer-events-none absolute inset-0" aria-hidden>
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to right, rgba(1,1,1,0.92) 0%, rgba(1,1,1,0.6) 30%, rgba(1,1,1,0.15) 60%, transparent 82%)",
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(1,1,1,0.95) 0%, rgba(1,1,1,0.5) 26%, transparent 62%)",
                      }}
                    />
                  </div>

                  {/* Mute toggle — only once the trailer is actually up */}
                  {trailerSrc && trailerOn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
                      aria-label={muted ? "Unmute" : "Mute"}
                      className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/[0.14] backdrop-blur-sm transition-colors hover:bg-black/70"
                    >
                      {muted ? (
                        <VolumeX className="h-[14px] w-[14px]" />
                      ) : (
                        <Volume2 className="h-[14px] w-[14px]" />
                      )}
                    </button>
                  )}

                  {/* ── Copy block ── */}
                  <div
                    key={`copy-${item.id}`}
                    className="absolute inset-x-0 bottom-0 z-20 p-5 md:p-7 lg:p-9"
                    style={{
                      animation:
                        "fade-in-up 0.6s 0.12s cubic-bezier(0.16,1,0.3,1) both",
                    }}
                  >
                    {/* Logo art, or the title set as one */}
                    {info.logo ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w500${info.logo}`}
                        alt={item.title}
                        className="mb-3 max-h-14 w-auto max-w-[220px] object-contain object-left drop-shadow-[0_2px_24px_rgba(0,0,0,0.95)] md:mb-4 md:max-h-20 md:max-w-[320px] lg:max-h-24 lg:max-w-[400px]"
                      />
                    ) : !info.logoFetched ? (
                      <div className="mb-3 h-9 w-40 animate-pulse bg-white/[0.07] md:mb-4 md:h-14 md:w-64" />
                    ) : (
                      <h3
                        className="mb-3 max-w-[16ch] text-balance font-manrope text-[26px] font-bold leading-[1.02] tracking-[-0.025em] text-white md:mb-4 md:text-[38px] lg:text-[46px]"
                        style={{ textShadow: "0 2px 30px rgba(0,0,0,0.95)" }}
                      >
                        {item.title}
                      </h3>
                    )}

                    {/* Meta strip */}
                    <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-manrope text-[12.5px] text-neutral-400 md:mb-4 md:text-[14px]">
                      {item.vote_average > 0 && (
                        <span className="flex items-center gap-1.5 font-space font-bold text-[#4ade80]">
                          <Star className="h-3 w-3 fill-[#4ade80]" />
                          {item.vote_average.toFixed(1)}
                        </span>
                      )}
                      {item.year && (
                        <>
                          <span className="text-white/[0.22]">•</span>
                          <span className="font-space">{item.year}</span>
                        </>
                      )}
                      {runtimeLabel && (
                        <>
                          <span className="text-white/[0.22]">•</span>
                          <span className="font-space">{runtimeLabel}</span>
                        </>
                      )}
                      {item.genres.length > 0 && (
                        <>
                          <span className="text-white/[0.22]">•</span>
                          <span>
                            {item.genres.map((g, i) => (
                              <span key={g.id}>
                                {i > 0 && ", "}
                                <Link prefetch={false}
                                  href={`/${item.media_type === "movie" ? "films" : "series"}?genre=${g.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/70"
                                >
                                  {g.name}
                                </Link>
                              </span>
                            ))}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Pitch — the context a poster grid can never give */}
                    {item.overview && (
                      <p className="mb-5 hidden max-w-[52ch] font-manrope text-[14.5px] leading-[1.65] text-neutral-300/85 md:line-clamp-2 lg:block">
                        {item.overview}
                      </p>
                    )}

                    {/* Actions + cast */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openWatch();
                        }}
                        className="group/play flex items-center gap-2.5"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white transition-transform duration-200 group-hover/play:scale-[1.07]">
                          <Play className="ml-0.5 h-[15px] w-[15px] fill-black text-black" />
                        </span>
                        <span className="font-manrope text-[14px] font-bold tracking-[0.01em] text-white">
                          Watch Now
                        </span>
                      </button>

                      <div className="hidden h-4 w-px bg-white/[0.12] sm:block" />

                      <Link prefetch={false}
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 font-manrope text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:text-white"
                      >
                        <Info className="h-3.5 w-3.5" />
                        Details
                      </Link>

                      {(info.cast?.length ?? 0) > 0 && (
                        <>
                          <div className="hidden h-4 w-px bg-white/[0.12] lg:block" />
                          <div className="hidden items-center lg:flex">
                            {info.cast!.map((c, i) => (
                              <Link prefetch={false}
                                key={c.id}
                                href={`/person/${c.id}`}
                                onClick={(e) => e.stopPropagation()}
                                title={c.name}
                                className={cn(
                                  "h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-800 ring-[1.5px] ring-black transition-transform duration-150 hover:z-10 hover:scale-110",
                                  i > 0 && "-ml-2",
                                )}
                              >
                                {c.profile_path ? (
                                  <img
                                    src={`https://image.tmdb.org/t/p/w45${c.profile_path}`}
                                    alt={c.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center font-manrope text-[9px] text-neutral-500">
                                    {c.name[0]}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ═══ The rail ═══
                    Horizontal strip on phones, vertical filmstrip beside the
                    frame from lg up — where it doubles as the slide indicator. */}
                {items.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:w-[210px] lg:shrink-0 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0 xl:w-[250px]">
                    {items.map((pick, i) => {
                      const active = i === idx;
                      return (
                        <button
                          key={pick.id}
                          onClick={() => goTo(i)}
                          aria-label={pick.title}
                          aria-current={active}
                          className={cn(
                            "group/rail relative aspect-[16/9] w-[128px] shrink-0 overflow-hidden border bg-neutral-900 transition-all duration-300 sm:w-[150px] lg:aspect-auto lg:w-full lg:flex-1",
                            active
                              ? "border-white/25 opacity-100"
                              : "border-white/[0.06] opacity-45 hover:opacity-80",
                          )}
                        >
                          <BlurImage
                            src={`https://image.tmdb.org/t/p/w300${pick.backdrop_path}`}
                            alt={pick.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover/rail:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                          <span className="absolute left-2 top-1.5 font-space text-[10px] font-bold tabular-nums tracking-[0.1em] text-white/70">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="absolute inset-x-2 bottom-1.5 truncate text-left font-manrope text-[11px] font-medium text-white/90">
                            {pick.title}
                          </span>

                          {/* Slide timer — the rail is the progress indicator */}
                          {active && (
                            <span className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-white/15">
                              <span
                                key={`t-${idx}-${paused}`}
                                className="absolute inset-0 origin-left bg-[#e50914]"
                                style={{
                                  animation: paused
                                    ? "none"
                                    : `progressTrack ${SLIDE_MS}ms linear forwards`,
                                }}
                              />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Watch modals ── */}
      {showWatch && item && item.media_type === "movie" && (
        <WatchModal
          movie={{
            id: item.id,
            title: item.title,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            release_date: item.date || `${item.year}-01-01`,
          }}
          logo={info.logo ?? null}
          runtimeLabel={runtimeLabel}
          genres={item.genres}
          originRect={originRect}
          posterSrc={`https://image.tmdb.org/t/p/w1280${item.backdrop_path}`}
          onClose={() => setShowWatch(false)}
        />
      )}
      {showWatch && item && item.media_type === "tv" && (
        <TvWatchModal
          showId={item.id}
          showName={item.title}
          backdropPath={item.backdrop_path}
          logo={info.logo ?? null}
          seasons={info.seasons ?? []}
          rating={item.vote_average}
          year={item.year || null}
          onClose={() => setShowWatch(false)}
        />
      )}
    </>
  );
}

function SpotlightSkeleton() {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
      <div className="relative aspect-[16/9] w-full animate-pulse bg-white/[0.04] lg:aspect-[2/1] lg:flex-1">
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 md:p-7 lg:p-9">
          <div className="h-10 w-52 rounded bg-white/[0.05] md:h-16 md:w-72" />
          <div className="h-3 w-44 rounded bg-white/[0.05]" />
          <div className="h-10 w-40 rounded-full bg-white/[0.05]" />
        </div>
      </div>
      <div className="flex gap-2 lg:w-[210px] lg:shrink-0 lg:flex-col xl:w-[250px]">
        {Array.from({ length: MAX_PICKS }).map((_, i) => (
          <div
            key={i}
            className="aspect-[16/9] w-[128px] shrink-0 animate-pulse bg-white/[0.04] sm:w-[150px] lg:aspect-auto lg:h-[68px] lg:w-full"
          />
        ))}
      </div>
    </div>
  );
}
