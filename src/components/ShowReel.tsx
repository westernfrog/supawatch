"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import WatchModal, { type OriginRect } from "@/components/WatchModal";
import TvWatchModal from "@/components/TvWatchModal";
import BlurImage from "@/components/BlurImage";
import { fetchJson } from "@/lib/client-api";
import { useInView } from "@/lib/useInView";

interface CastMember {
  id: number;
  name: string;
  profile_path: string | null;
}

interface SeasonItem {
  season_number: number;
  episode_count: number;
  name: string;
}

interface ShowItem {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  year: string;
  genres: string[];
  media_type: "movie" | "tv";
  cast: CastMember[];
  seasons: number | null;
  seasons_list: SeasonItem[];
  runtime: number | null;
  vote_average: number;
  release_date: string | null;
  trailerKey: string | null;
  provider: { logo_path: string; provider_name: string } | null;
  backdrops: string[];
}

interface RawResult {
  id: number;
  title?: string;
  name?: string;
  backdrop_path: string | null;
  poster_path: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: string;
}

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  27: "Horror",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10765: "Sci-Fi & Fantasy",
  10762: "Kids",
  10764: "Reality",
};

interface Props {
  title: string;
  subtitle?: string;
  fetchUrl: string;
  limit?: number;
  mediaType?: "movie" | "tv";
  /* Hide these ids — used by personalized rows to skip titles the user
     has already interacted with. */
  excludeIds?: number[];
}

export default function ShowReel({
  title,
  subtitle,
  fetchUrl,
  limit = 12,
  mediaType,
  excludeIds,
}: Props) {
  const [items, setItems] = useState<ShowItem[]>([]);
  const [loading, setLoading] = useState(true);
  /* Defer both the list fetch and the per-item credits fan-out until the
     section approaches the viewport — off-screen reels cost zero requests. */
  const { ref, inView } = useInView();
  const excludeKey = (excludeIds ?? []).join(",");

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const exclude = new Set(
      excludeKey ? excludeKey.split(",").map(Number) : [],
    );

    fetchJson(fetchUrl)
      .then(async (d) => {
        const raw: RawResult[] = d.results ?? d.data?.results ?? [];
        const filtered = raw
          .filter((m) => m.backdrop_path && !exclude.has(m.id))
          .slice(0, limit);

        const mapped: ShowItem[] = filtered.map((m) => ({
          id: m.id,
          title: m.title ?? m.name ?? "",
          overview: m.overview ?? "",
          backdrop_path: m.backdrop_path,
          poster_path: m.poster_path,
          year: (m.release_date ?? m.first_air_date ?? "").slice(0, 4),
          genres: (m.genre_ids ?? [])
            .slice(0, 2)
            .map((id) => GENRE_MAP[id])
            .filter(Boolean) as string[],
          media_type: (m.media_type as "movie" | "tv") ?? mediaType ?? "tv",
          cast: [],
          seasons: null,
          seasons_list: [],
          runtime: null,
          vote_average: 0,
          release_date: null,
          trailerKey: null,
          provider: null,
          backdrops: [],
        }));

        if (!cancelled) setItems(mapped);

        const metaResults = await Promise.all(
          mapped.map((item) =>
            fetchJson(`/api/getCredits?id=${item.id}&type=${item.media_type}`)
              .then((d) => ({ id: item.id, ...d }))
              .catch(() => ({
                id: item.id,
                cast: [],
                seasons: null,
                seasons_list: [],
                runtime: null,
                vote_average: 0,
                release_date: null,
                trailerKey: null,
                provider: null,
                backdrops: [],
              })),
          ),
        );

        if (!cancelled) {
          const metaById = Object.fromEntries(
            metaResults.map((r) => [r.id, r]),
          );
          setItems((prev) =>
            prev.map((item) => ({
              ...item,
              cast: metaById[item.id]?.cast ?? [],
              seasons: metaById[item.id]?.seasons ?? null,
              seasons_list: metaById[item.id]?.seasons_list ?? [],
              runtime: metaById[item.id]?.runtime ?? null,
              vote_average: metaById[item.id]?.vote_average ?? 0,
              release_date:
                metaById[item.id]?.release_date ??
                metaById[item.id]?.first_air_date ??
                null,
              trailerKey: metaById[item.id]?.trailerKey ?? null,
              provider: metaById[item.id]?.provider ?? null,
              backdrops: metaById[item.id]?.backdrops ?? [],
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchUrl, limit, mediaType, inView, excludeKey]);

  /* Nothing came back (thin catalog, failed fetch) — drop the whole
     section rather than strand an empty header. */
  if (!loading && items.length === 0) return null;

  return (
    <div ref={ref} className="snap-section py-12 lg:py-16">
      {/* Header */}
      <div className="mb-6 px-5 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4">
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

      {/* Scroll Reel */}
      <div className="px-5 md:px-8 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-hide md:gap-5 lg:gap-6">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))
              : items.map((item) => <Card key={item.id} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Adaptive trailer reveal ──
   The montage holds only as long as the trailer actually needs. YouTube
   reports playback through its widget postMessage API (we handshake with
   "listening" on iframe load); the reveal fires PLAYING_SETTLE after real
   playback begins — long enough for YT's own title overlay to fade — but
   never before MIN_WAIT (the montage gets one full breath). MAX_WAIT is
   the fallback when player events never arrive. */
const PLAYING_SETTLE = 3600;
const MIN_WAIT = 3600;
const MAX_WAIT = 6000;

/* Minimum clean stills for the scene montage; below this the card's own
   backdrop does a slow Ken Burns push instead. */
const MIN_MONTAGE_SCENES = 3;

function Card({ item }: { item: ShowItem }) {
  const [showWatch, setShowWatch] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [trailerVisible, setTrailerVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [montageGone, setMontageGone] = useState(false);
  const [barLocked, setBarLocked] = useState(false);
  const [originRect, setOriginRect] = useState<OriginRect | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverStartRef = useRef(0);
  const revealScheduledRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const href = `/${item.media_type}/${item.id}`;

  const openWatch = () => {
    const r = thumbRef.current?.getBoundingClientRect();
    if (r)
      setOriginRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    setShowWatch(true);
  };

  const runtimeLabel = item.runtime
    ? item.media_type === "tv"
      ? `${item.runtime}m / ep`
      : item.runtime >= 60
        ? `${Math.floor(item.runtime / 60)}h${item.runtime % 60 > 0 ? ` ${item.runtime % 60}m` : ""}`
        : `${item.runtime}m`
    : null;

  const trailerSrc = item.trailerKey
    ? `https://www.youtube.com/embed/${item.trailerKey}?autoplay=1&mute=1&loop=1&playlist=${item.trailerKey}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&enablejsapi=1&vq=hd1080`
    : null;

  /* Every hover gets a cinematic pre-roll: the filmstrip montage when the
     title has enough clean stills, otherwise a single-shot treatment of
     its best frame (falling back to the card backdrop). */
  const preRollScenes =
    item.backdrops.length >= MIN_MONTAGE_SCENES
      ? item.backdrops
      : item.backdrops[0]
        ? [item.backdrops[0]]
        : item.backdrop_path
          ? [item.backdrop_path]
          : [];

  /* Dissolve into the trailer. Keep the montage mounted briefly so it
     crossfades with the video focusing in, then drop it. */
  const reveal = useCallback(() => {
    setTrailerVisible(true);
    exitTimerRef.current = setTimeout(() => setMontageGone(true), 900);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!trailerSrc) return;
    setIsHovering(true);
    setMontageGone(false);
    setBarLocked(false);
    revealScheduledRef.current = false;
    hoverStartRef.current = Date.now();
    revealTimerRef.current = setTimeout(reveal, MAX_WAIT);
  }, [trailerSrc, reveal]);

  const handleMouseLeave = useCallback(() => {
    for (const timer of [revealTimerRef, settleTimerRef, exitTimerRef]) {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    }
    revealScheduledRef.current = false;
    setIsHovering(false);
    setTrailerVisible(false);
    setIsMuted(true);
    setMontageGone(false);
    setBarLocked(false);
  }, []);

  /* Listen for the player's real state. The moment YouTube confirms
     playback, swap the fallback clock for a short settle window — fast
     connections reveal in ~3s instead of always waiting the full 6. */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const frame = iframeRef.current;
      if (!frame || e.source !== frame.contentWindow) return;
      let d;
      try {
        d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const playing =
        (d?.event === "onStateChange" && d?.info === 1) ||
        (d?.event === "infoDelivery" && d?.info?.playerState === 1);
      if (!playing || revealScheduledRef.current) return;

      revealScheduledRef.current = true;
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      const elapsed = Date.now() - hoverStartRef.current;
      setBarLocked(true);
      settleTimerRef.current = setTimeout(
        reveal,
        Math.max(MIN_WAIT - elapsed, PLAYING_SETTLE),
      );
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [reveal]);

  return (
    <>
      <div className="group flex w-[400px] shrink-0 snap-start flex-col gap-0 sm:w-[500px] md:w-[580px] lg:w-[660px]">
        {/* Thumbnail — hover plays trailer, click opens watch modal */}
        <div
          ref={thumbRef}
          className="relative aspect-[16/9] w-full cursor-pointer overflow-hidden border border-white/[0.06] bg-neutral-900"
          onClick={openWatch}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {item.backdrop_path ? (
            <BlurImage
              src={`https://image.tmdb.org/t/p/w780${item.backdrop_path}`}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-manrope text-[11px] uppercase tracking-widest text-white/20">
              No Image
            </div>
          )}

          {/* YouTube iframe — loads hidden on hover, revealed after progress bar completes */}
          {isHovering && trailerSrc && (
            <div
              className={cn(
                "absolute inset-0 z-10 overflow-hidden",
                trailerVisible ? "animate-trailer-reveal" : "opacity-0",
              )}
            >
              <iframe
                ref={iframeRef}
                src={trailerSrc}
                title={`${item.title} trailer`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                onLoad={(e) => {
                  /* Widget-API handshake — YouTube only starts emitting
                     state events after the parent says it's listening. */
                  e.currentTarget.contentWindow?.postMessage(
                    JSON.stringify({
                      event: "listening",
                      id: `sw-reel-${item.id}`,
                      channel: "widget",
                    }),
                    "*",
                  );
                }}
                className="absolute border-0"
                style={{
                  pointerEvents: "none",
                  top: "-30%",
                  left: "-15%",
                  width: "130%",
                  height: "160%",
                }}
              />
              {/* Invisible barrier — prevents YouTube from detecting hover */}
              <div className="absolute inset-0" />

              {/* Mute / Unmute toggle — appears once the montage has dissolved */}
              {trailerVisible && montageGone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const cmd = isMuted ? "unMute" : "mute";
                    iframeRef.current?.contentWindow?.postMessage(
                      JSON.stringify({ event: "command", func: cmd, args: "" }),
                      "*",
                    );
                    setIsMuted((m) => !m);
                  }}
                  className="absolute bottom-4 right-4 z-20 flex items-center justify-center transition-opacity hover:opacity-100 opacity-80"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg
                      className="h-6 w-6 text-white drop-shadow-lg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg
                      className="h-6 w-6 text-white drop-shadow-lg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Scene montage — an accelerating crossfade cut of the film's
              stills, framed in letterbox and graded with grain + vignette,
              that dissolves into the trailer (masking YouTube's branding
              while the iframe loads). */}
          {isHovering && !montageGone && preRollScenes.length > 0 && (
            <SceneCarousel
              scenes={preRollScenes}
              duration={MAX_WAIT}
              exiting={trailerVisible}
            />
          )}

          {/* Projector flash — a single bloom that masks the cut from the
              montage into the playing trailer. */}
          {trailerVisible && !montageGone && (
            <div className="pointer-events-none absolute inset-0 z-30 animate-reel-flash" />
          )}

          {/* Watch provider badge — bottom-left */}
          {item.provider && (
            <div className="absolute bottom-3 left-3 z-20">
              <img
                src={`https://image.tmdb.org/t/p/w154${item.provider.logo_path}`}
                alt={item.provider.provider_name}
                title={item.provider.provider_name}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 rounded-lg ring-1 ring-white/10 shadow-lg"
              />
            </div>
          )}

          {/* Trailer badge — bottom-right (only before trailer plays) */}
          {item.trailerKey && !trailerVisible && (
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 px-2 py-1 backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <svg
                className="h-3 w-3 text-white/70"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="font-space text-[9px] uppercase tracking-widest text-white/70">
                Trailer
              </span>
            </div>
          )}

          {/* Progress bar that tells the truth — eases toward 82% while the
              player tunes in, then runs confidently to full the moment
              playback is confirmed */}
          {isHovering && !trailerVisible && trailerSrc && (
            <div className="absolute bottom-0 left-0 right-0 z-40 h-[3px] bg-white/5">
              <AdaptiveBar locked={barLocked} />
            </div>
          )}
        </div>

        {/* Below-card info */}
        <div className="flex flex-col gap-3 pt-4">
          {/* Top Section */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-manrope text-[24px] font-semibold leading-none tracking-tight text-white/95 line-clamp-1">
                {item.title}
              </h3>
            </div>

            {/* Meta Strip */}
            <div className="mt-1 flex items-center gap-3 font-manrope text-[15.5px] font-medium text-white/70">
              {item.year && <span>{item.year}</span>}

              {item.year && (item.seasons || runtimeLabel) && (
                <span className="text-white/20">·</span>
              )}

              {item.media_type === "tv" && item.seasons ? (
                <span>
                  {item.seasons} {item.seasons === 1 ? "Season" : "Seasons"}
                </span>
              ) : runtimeLabel ? (
                <span>{runtimeLabel}</span>
              ) : null}

              {(item.year || item.seasons || runtimeLabel) &&
                item.genres.length > 0 && (
                  <span className="text-white/20">·</span>
                )}
              {item.genres.length > 0 && (
                <span>
                  {item.genres.map((g, i) => {
                    const gid = Object.entries(GENRE_MAP).find(
                      ([_, v]) => v === g,
                    )?.[0];
                    return (
                      <span key={g}>
                        {gid ? (
                          <Link
                            href={`/genre/${gid}`}
                            onClick={(e) => e.stopPropagation()}
                            className="underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white/80"
                          >
                            {g}
                          </Link>
                        ) : (
                          <span className="underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white/80">
                            {g}
                          </span>
                        )}
                        {i < item.genres.length - 1 && ", "}
                      </span>
                    );
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Cast */}
          <div className="flex items-center gap-3 overflow-hidden pt-1">
            {item.cast.length > 0 ? (
              <>
                <span className="shrink-0 font-space text-[9px] uppercase tracking-[0.2em] text-neutral-600">
                  Starring
                </span>
                <div className="flex shrink-0 -space-x-1.5">
                  {item.cast.slice(0, 4).map((c) => (
                    <Link
                      key={c.id}
                      href={`/person/${c.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block h-6 w-6 rounded-full bg-neutral-800 ring-2 ring-[#010101] hover:ring-white/50 transition-all"
                      title={c.name}
                    >
                      {c.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w45${c.profile_path}`}
                          alt={c.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full font-manrope text-[8px] text-neutral-400">
                          {c.name[0]}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
                <div className="truncate font-manrope text-[14px] text-neutral-400">
                  {item.cast.slice(0, 2).map((c, i) => (
                    <span key={c.id}>
                      <Link
                        href={`/person/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="transition-colors hover:text-white hover:underline decoration-white/30 underline-offset-4"
                      >
                        {c.name}
                      </Link>
                      {i < Math.min(item.cast.length, 2) - 1 ? ", " : ""}
                    </span>
                  ))}
                  {item.cast.length > 2 && " & more"}
                </div>
              </>
            ) : (
              <div className="font-space text-[10px] uppercase tracking-widest text-neutral-600">
                Cast TBA
              </div>
            )}
          </div>

          {/* Details Link */}
          <Link
            href={href}
            className="group/link mt-2 flex w-fit items-center gap-1 font-manrope text-[14.5px] text-white/70 underline underline-offset-4 decoration-white/30 transition-colors hover:text-white hover:decoration-white/60"
          >
            Details
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Watch modals */}
      {showWatch && item.media_type === "movie" && item.backdrop_path && (
        <WatchModal
          movie={{
            id: item.id,
            title: item.title,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            release_date: item.release_date ?? `${item.year}-01-01`,
          }}
          runtimeLabel={runtimeLabel}
          genres={item.genres.map((name, i) => ({ id: i, name }))}
          originRect={originRect}
          posterSrc={
            item.backdrop_path
              ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
              : null
          }
          onClose={() => setShowWatch(false)}
        />
      )}
      {showWatch &&
        item.media_type === "tv" &&
        item.seasons_list.length > 0 && (
          <TvWatchModal
            showId={item.id}
            showName={item.title}
            backdropPath={item.backdrop_path}
            logo={null}
            seasons={item.seasons_list}
            rating={item.vote_average}
            year={item.year || null}
            onClose={() => setShowWatch(false)}
          />
        )}
    </>
  );
}

/*
 * Scene montage — a cinematic pre-roll for the trailer. With enough clean
 * stills, a vertical filmstrip slowly pans top→bottom, each frame breathing
 * with a gentle Ken Burns push. With only one frame, it becomes a single
 * shot: a rack-focus opener that settles into a slow push-in, like a
 * projector finding its frame. Both are squeezed into letterbox scope and
 * graded with vignette + film grain. When `exiting` flips, everything
 * blooms, racks out of focus, and dissolves into the video.
 */
function SceneCarousel({
  scenes,
  duration,
  exiting,
}: {
  scenes: string[];
  duration: number;
  exiting: boolean;
}) {
  const [reduce] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  const single = scenes.length < MIN_MONTAGE_SCENES;
  const maxScenes = Math.min(scenes.length, 5);
  const selectedScenes = scenes.slice(0, maxScenes);

  const containerAnim = exiting
    ? reduce
      ? "reel-fade-out 280ms linear forwards"
      : "montage-out 900ms cubic-bezier(0.4, 0, 0.2, 1) forwards"
    : reduce
      ? "none"
      : "montage-in 700ms cubic-bezier(0.22, 1, 0.36, 1) both";

  const letterboxAnim = reduce
    ? "none"
    : "letterbox-in 700ms cubic-bezier(0.22, 1, 0.36, 1) both";

  return (
    <div
      className="absolute inset-0 z-[15] overflow-hidden bg-black"
      style={{ animation: containerAnim }}
    >
      {single ? (
        /* One-shot pre-roll — a rack focus settles the frame into exposure
           while a locked-off camera pushes in for the whole hold. */
        <img
          src={`https://image.tmdb.org/t/p/w780${scenes[0]}`}
          alt=""
          className="h-full w-full object-cover will-change-transform"
          style={{
            filter: "saturate(1.05) contrast(1.08) brightness(0.98)",
            animation: reduce
              ? "none"
              : `still-drift ${duration}ms cubic-bezier(0.25, 1, 0.5, 1) both, still-focus 1500ms cubic-bezier(0.22, 1, 0.36, 1) both`,
          }}
          draggable={false}
        />
      ) : (
        <>
          {/* Vertical filmstrip — a single slow camera move panning
              top→bottom down the column of stills. */}
          <div
            className="flex h-full w-full flex-col will-change-transform"
            style={{
              animation: reduce
                ? "none"
                : `slide-vertical ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
            }}
          >
            {selectedScenes.map((path, i) => (
              <div
                key={`${path}-${i}`}
                className="relative h-full w-full shrink-0 overflow-hidden bg-black"
              >
                <img
                  src={`https://image.tmdb.org/t/p/w780${path}`}
                  alt=""
                  className="h-full w-full object-cover will-change-transform"
                  style={{
                    filter: "saturate(1.05) contrast(1.08) brightness(0.98)",
                    // Each still breathes with a slow scale so the frame is
                    // never dead while the strip pans over it.
                    animation: reduce
                      ? "none"
                      : `${i % 2 === 0 ? "scene-zoom-in" : "scene-zoom-out"} ${duration}ms ease-out both`,
                  }}
                  draggable={false}
                />
              </div>
            ))}
          </div>

          <style>{`
            @keyframes slide-vertical {
              0% { transform: translateY(0%); }
              100% { transform: translateY(-${(maxScenes - 1) * 100}%); }
            }
          `}</style>
        </>
      )}

      {/* Cinematic grade — vignette + top/bottom falloff for depth */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 46%, transparent 50%, rgba(0,0,0,0.62) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1/4 bg-gradient-to-b from-black/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />

      {/* Letterbox — the frame squeezes to cinema scope as the pre-roll
          begins; the bars ride the container's exit bloom back out. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[9%] origin-top bg-black"
        style={{ animation: letterboxAnim }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[9%] origin-bottom bg-black"
        style={{ animation: letterboxAnim }}
      />

      {/* Film grain */}
      <div
        className={cn(
          "scene-grain pointer-events-none absolute inset-[-25%] z-20 opacity-[0.32] mix-blend-overlay",
          !reduce && "scene-grain-anim",
        )}
      />
    </div>
  );
}

/* Two-phase progress: a quick ease-out crawl toward 82% while the player
   buffers (fast start feels alive, the slowdown is honest uncertainty),
   then a clean run to 100% over the settle window once YouTube confirms
   playback. If events never arrive it parks at 82% until the fallback
   reveal fires. */
function AdaptiveBar({ locked }: { locked: boolean }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    /* Start at 0 for one frame so the first transition actually animates. */
    const t = setTimeout(() => setArmed(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="h-full bg-[#e50914]"
      style={{
        width: locked ? "100%" : armed ? "82%" : "0%",
        transition: locked
          ? `width ${PLAYING_SETTLE}ms cubic-bezier(0.4, 0, 0.2, 1)`
          : `width ${MAX_WAIT}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="flex w-[400px] shrink-0 snap-start flex-col gap-0 sm:w-[500px] md:w-[580px] lg:w-[660px]">
      <div className="aspect-[16/9] w-full animate-pulse bg-white/[0.04]" />
      <div className="flex flex-col gap-2 pt-5">
        <div className="h-3 w-24 animate-pulse rounded bg-white/[0.04]" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.04]" />
        <div className="h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
        <div className="mt-1 flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="h-6 w-6 animate-pulse rounded-full bg-white/[0.04]" />
              <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
