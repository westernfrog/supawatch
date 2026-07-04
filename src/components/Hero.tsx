"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Play, Volume2, VolumeX, Info, Star } from "lucide-react";
import MovieDetailsModal from "./MovieDetailsModal";
import TvDetailsModal from "./TvDetailsModal";
import WatchModal from "./WatchModal";
import TvWatchModal from "./TvWatchModal";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/client-api";

const PROVIDER_URLS: Record<number, (title: string) => string> = {
  8:   (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  9:   (t) => `https://www.amazon.com/gp/video/search?phrase=${encodeURIComponent(t)}`,
  10:  (t) => `https://www.amazon.com/gp/video/search?phrase=${encodeURIComponent(t)}`,
  15:  (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,
  337: (t) => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}`,
  350: ()  => `https://tv.apple.com/`,
  384: (t) => `https://www.max.com/search?q=${encodeURIComponent(t)}`,
  386: (t) => `https://www.peacocktv.com/watch/search/${encodeURIComponent(t)}`,
  387: (t) => `https://www.peacocktv.com/watch/search/${encodeURIComponent(t)}`,
  531: (t) => `https://www.paramountplus.com/search/${encodeURIComponent(t)}/`,
  507: (t) => `https://mubi.com/en/search/${encodeURIComponent(t)}`,
  192: (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`,
  619: (t) => `https://www.britbox.com/search?q=${encodeURIComponent(t)}`,
  283: (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  37:  (t) => `https://www.fubo.tv/welcome/search?q=${encodeURIComponent(t)}`,
  209: (t) => `https://www.shudder.com/search?q=${encodeURIComponent(t)}`,
};

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
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const TV_GENRE_MAP: Record<number, string> = {
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

const SLIDE_MS = 40000;

interface Item {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  genre_ids: number[];
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
}

const itemTitle = (i: Item) => i.title ?? i.name ?? "";
const itemDate = (i: Item) => i.release_date ?? i.first_air_date ?? "";

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

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface ProvidersInfo {
  list: WatchProvider[];
  link: string | null;
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

export default function Hero() {
  const [items, setItems] = useState<Item[]>([]);
  const [region, setRegion] = useState("US");
  const [enriched, setEnriched] = useState<Record<number, Enriched>>({});
  const [idx, setIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [muted, setMuted] = useState(true);
  const [providersCache, setProvidersCache] = useState<
    Record<number, ProvidersInfo>
  >({});
  const [showModal, setShowModal] = useState(false);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [bgFrontId, setBgFrontId] = useState<number | null>(null);
  const [bgFront, setBgFront] = useState<Item | null>(null);
  const [bgBack, setBgBack] = useState<Item | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── fetch trending (mixed movies + tv, refreshes daily) + region (for providers) ── */
  useEffect(() => {
    fetchJson<{ region?: string }>("/api/getRegion", { ttlMs: 60 * 1000 })
      .then(({ region: r }) => setRegion(r ?? "US"))
      .catch(() => {});

    fetchJson<{ results?: Item[] }>("/api/getTrending")
      .then((res) => setItems((res.results ?? []).slice(0, 8)))
      .catch(console.error);
  }, []);

  /* ── enrich — logo, trailer, cast (movie- or tv-aware) ──
        Only the active slide and the one on deck are enriched; the rest
        resolve as the carousel advances instead of 8 requests upfront. */
  const enrichRequested = useRef<Set<number>>(new Set());
  useEffect(() => {
    const targets = [items[idx], items[(idx + 1) % items.length]].filter(
      (t): t is Item => Boolean(t) && !enrichRequested.current.has(t.id),
    );
    targets.forEach(({ id, media_type }) => {
      enrichRequested.current.add(id);
      const endpoint =
        media_type === "tv"
          ? "getTvDetailsEnhanced"
          : "getMovieDetailsEnhanced";
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
                media_type === "tv"
                  ? (res.data?.number_of_seasons ?? null)
                  : null,
              seasons:
                media_type === "tv"
                  ? (res.data?.seasons ?? []).filter((s: Season) => s.season_number >= 1)
                  : [],
              cast: (res.credits?.cast ?? []).slice(0, 4),
            },
          })),
        )
        .catch(() =>
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
          })),
        );
    });
  }, [items, idx]);

  /* ── auto-advance ── */
  const goTo = useCallback((i: number) => {
    setIdx(i);
    setShowVideo(false);
    setMuted(true);
  }, []);

  useEffect(() => {
    if (!items.length || showModal || showWatchModal) return;
    const t = setInterval(() => goTo((idx + 1) % items.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [idx, items.length, goTo, showModal, showWatchModal]);

  /* current slide's trailer key — null until enrichment resolves */
  const activeTrailerKey = items[idx]
    ? (enriched[items[idx].id]?.trailerKey ?? null)
    : null;

  /* ── video reveal — start the 6s countdown only once the trailer key is
        known, so the progress bar and the reveal stay perfectly in sync ── */
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!activeTrailerKey) return;
    timerRef.current = setTimeout(() => setShowVideo(true), 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, activeTrailerKey]);

  /* ── watch providers (lazy, cached per item) ── */
  useEffect(() => {
    const item = items[idx];
    if (!item || providersCache[item.id] !== undefined) return;
    fetchJson(
      `/api/getWatchProviders?id=${item.id}&region=${region}&media_type=${item.media_type}`,
    )
      .then((res) =>
        setProvidersCache((p) => ({
          ...p,
          [item.id]: { list: res.providers ?? [], link: res.link ?? null },
        })),
      )
      .catch(() =>
        setProvidersCache((p) => ({
          ...p,
          [item.id]: { list: [], link: null },
        })),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, idx, region]);

  /* ── mute toggle ── */
  const toggleMute = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: muted ? "unMute" : "mute",
        args: "",
      }),
      "*",
    );
    setMuted((m) => !m);
  };

  /* ── force HD quality via postMessage once player is ready / playing ── */
  useEffect(() => {
    const forceHD = () => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "setPlaybackQualityRange",
          args: ["hd1080", "hd1080"],
        }),
        "*",
      );
    };
    const onMessage = (e: MessageEvent) => {
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (
          d.event === "onReady" ||
          (d.event === "onStateChange" && d.info === 1)
        ) {
          forceHD();
        }
      } catch {
        /* non-YT messages, ignore */
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /* ── pause trailer while any modal is open; resume when closed ── */
  useEffect(() => {
    const fn = showWatchModal || showModal ? "pauseVideo" : "playVideo";
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: fn, args: "" }),
      "*",
    );
  }, [showWatchModal, showModal]);

  /* ── derived ── */
  const item = items[idx];

  /* keep the previous backdrop mounted underneath so the new one crossfades in over it
     instead of cutting to black for an instant */
  if (item && item.id !== bgFrontId) {
    setBgBack(bgFront);
    setBgFront(item);
    setBgFrontId(item.id);
  }

  const info = item
    ? (enriched[item.id] ?? ({} as Partial<Enriched>))
    : ({} as Partial<Enriched>);
  const genreMap = item?.media_type === "tv" ? TV_GENRE_MAP : GENRE_MAP;
  const genres = (item?.genre_ids.slice(0, 3) ?? [])
    .map((id) => ({ id, name: genreMap[id] }))
    .filter((g) => g.name);
  const title = item ? itemTitle(item) : "";
  const year = item ? itemDate(item)?.slice(0, 4) : undefined;
  const rt = (info as Enriched).runtime;
  const seasonCount = (info as Enriched).seasonCount;
  const rtStr =
    item?.media_type === "tv"
      ? seasonCount
        ? `${seasonCount} Season${seasonCount === 1 ? "" : "s"}`
        : null
      : rt
        ? `${Math.floor(rt / 60)}h ${rt % 60}m`
        : null;
  const cast = (info as Enriched).cast ?? [];
  const providers = item ? (providersCache[item.id]?.list ?? []) : [];
  const providersLink = item ? (providersCache[item.id]?.link ?? null) : null;
  const tKey = (info as Enriched).trailerKey;
  const tSrc = tKey
    ? `https://www.youtube.com/embed/${tKey}?autoplay=1&mute=1&loop=1&playlist=${tKey}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&enablejsapi=1&vq=hd1080`
    : null;

  /* ── skeleton ── */
  if (!item)
    return (
      <>
        <section className="relative hidden h-screen overflow-hidden bg-[#010101] lg:block">
          <div className="absolute inset-x-12 bottom-0">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="border-t border-white/[0.06] py-4 space-y-3"
              >
                <div className="h-3 w-64 animate-pulse rounded-sm bg-white/[0.05]" />
                {n === 2 && (
                  <div className="h-20 w-[500px] animate-pulse rounded-sm bg-white/[0.07]" />
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="lg:hidden">
          <div
            className="animate-pulse bg-neutral-900/40"
            style={{ height: "72vh", minHeight: "500px" }}
          />
          <div className="bg-[#010101] px-5 py-5">
            <div className="mb-3 h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
            <div className="mb-4 h-9 w-52 animate-pulse rounded bg-white/[0.07]" />
            <div className="mb-2 h-3 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.05]" />
          </div>
        </section>
      </>
    );

  return (
    <>
      {/* ══════════════════  DESKTOP  ══════════════════ */}
      <section className="relative hidden h-screen overflow-hidden lg:block">
        {/* Backdrop — cinematic cross-dissolve: the new frame blooms in over the
            previous one as it eases back into a soft, dim blur */}
        <div className="absolute inset-0 overflow-hidden">
          {bgBack && (
            <img
              key={`bgback-${bgBack.id}`}
              src={`https://image.tmdb.org/t/p/original${bgBack.backdrop_path}`}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{
                animation: "recede 1.6s cubic-bezier(0.33,0,0.2,1) both",
                willChange: "transform, filter",
              }}
            />
          )}
          {bgFront && (
            <div
              key={`bgfront-${bgFront.id}-${idx}`}
              className="absolute inset-0 overflow-hidden"
              style={{
                animation: "cinematic-in 1.6s cubic-bezier(0.22,1,0.36,1) both",
                willChange: "transform, opacity, filter",
              }}
            >
              <img
                src={`https://image.tmdb.org/t/p/original${bgFront.backdrop_path}`}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover object-center"
                style={{
                  animation: "ken-burns 22s ease-in-out infinite alternate",
                }}
              />
            </div>
          )}
        </div>

        {/* YouTube trailer */}
        {tSrc && (
          <div
            className={cn(
              "absolute inset-0",
              showVideo ? "animate-trailer-reveal" : "opacity-0",
            )}
          >
            <iframe
              ref={iframeRef}
              src={tSrc}
              allow="autoplay; encrypted-media"
              className="absolute inset-0 h-full w-full"
              style={{
                border: "none",
                pointerEvents: "none",
                transform: "scale(1.35)",
              }}
            />
            <div className="absolute inset-0 z-10 bg-transparent" />
          </div>
        )}

        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(1,1,1,0.92) 0%, rgba(1,1,1,0.62) 28%, rgba(1,1,1,0.22) 52%, transparent 75%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(1,1,1,0.88) 0%, rgba(1,1,1,0.48) 20%, rgba(1,1,1,0.12) 40%, transparent 56%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(1,1,1,0.38) 0%, transparent 12%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 28% at 100% 0%, rgba(1,1,1,0.72) 0%, transparent 100%)",
            }}
          />
        </div>

        {/* ── Content block ── */}
        <div
          className="absolute inset-x-12 bottom-0"
          style={{
            animation: "fade-in-up 0.55s 0.1s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {/* ─── Title / Logo ─── */}
          <div
            key={`title-${idx}`}
            className="pb-4"
            style={{
              animation: "fade-in-up 0.5s 0s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            {(info as Enriched).logo ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${(info as Enriched).logo}`}
                alt={title}
                className="max-h-[12rem] w-auto max-w-[600px] object-contain drop-shadow-[0_2px_30px_rgba(0,0,0,0.95)]"
              />
            ) : !(info as Enriched).logoFetched ? (
              <div className="h-[80px] w-[460px] animate-pulse bg-white/[0.06]" />
            ) : (
              <h1
                className="font-nichrome font-black leading-[0.88] text-white uppercase tracking-tight"
                style={{
                  fontSize: "clamp(4.5rem, 7vw, 9rem)",
                  textShadow:
                    "0 2px 40px rgba(0,0,0,0.95), 0 0 80px rgba(0,0,0,0.6)",
                }}
              >
                {title}
              </h1>
            )}

            <p
              key={`ov-${idx}`}
              className="mt-5 mb-3 max-w-[52ch] text-[16px] leading-[1.7] text-neutral-300/90 line-clamp-2"
              style={{
                animation:
                  "fade-in-up 0.5s 0.06s cubic-bezier(0.16,1,0.3,1) both",
              }}
            >
              {item.overview}
            </p>
          </div>

          {/* ─── Meta strip ─── */}
          <div
            key={`meta-${idx}`}
            className="mb-4 flex items-center gap-2.5 font-manrope text-[14px] text-neutral-400"
            style={{
              textShadow: "0 1px 16px rgba(0,0,0,0.95)",
              animation: "fade-in-up 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <span className="flex items-center gap-1.5 font-space text-[14px] font-bold text-[#4ade80]">
              <Star className="h-3 w-3 fill-[#4ade80]" />
              {item.vote_average.toFixed(1)}
            </span>

            {year && (
              <>
                <span className="text-white/[0.22]">•</span>
                <span className="font-space">{year}</span>
              </>
            )}
            {!(info as Enriched).logoFetched ? (
              <>
                <span className="text-white/[0.22]">•</span>
                <span className="inline-block h-3 w-12 animate-pulse rounded-sm bg-white/10" />
              </>
            ) : (
              rtStr && (
                <>
                  <span className="text-white/[0.22]">•</span>
                  <span className="font-space">{rtStr}</span>
                </>
              )
            )}
            {genres.length > 0 && (
              <>
                <span className="text-white/[0.22]">•</span>
                <span className="text-neutral-400">
                  {genres.map((g, i) => (
                    <span key={g.id}>
                      {i > 0 && <span className="text-neutral-400">, </span>}
                      <Link
                        href={`/movie?genre=${g.id}`}
                        className="underline decoration-neutral-500 decoration-1 underline-offset-[3px] transition-colors hover:text-white hover:decoration-white/50"
                      >
                        {g.name}
                      </Link>
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>

          {/* ─── Cast ─── */}
          {cast.length > 0 && (
            <div
              key={`cast-${idx}`}
              className="flex items-center gap-3.5 pb-4"
              style={{
                animation:
                  "fade-in-up 0.5s 0.16s cubic-bezier(0.16,1,0.3,1) both",
              }}
            >
              <div className="flex items-center">
                {cast.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/person/${c.id}`}
                    className={cn(
                      "group relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-800 ring-[1.5px] ring-black transition-transform duration-150 hover:z-10 hover:scale-110",
                      i > 0 && "-ml-2.5",
                    )}
                  >
                    {c.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w45${c.profile_path}`}
                        alt={c.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-manrope text-[9px] text-neutral-600">
                        {c.name[0]}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              <Link
                href={
                  item.media_type === "tv"
                    ? `/tv/${item.id}`
                    : `/movie/${item.id}`
                }
                className="font-manrope text-[13px] font-medium text-neutral-400 transition-colors hover:text-white"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}
              >
                View Full Cast
              </Link>
            </div>
          )}

          {/* ─── Action bar ─── */}
          {/* ─── Action bar + slide numbers ─── */}
          <div className="flex items-center gap-5 pb-7 pt-2">
            {/* Play button */}
            <button
              onClick={() => setShowWatchModal(true)}
              className="group flex items-center gap-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white transition-all duration-200 group-hover:scale-[1.07] group-hover:shadow-[0_0_28px_rgba(255,255,255,0.15)]">
                <Play className="ml-0.5 h-[17px] w-[17px] fill-black text-black" />
              </div>
              <span className="font-manrope text-[15px] font-bold text-white tracking-[0.01em]">
                Watch Now
              </span>
            </button>

            <div className="h-4 w-px bg-white/[0.1]" />

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 font-manrope text-[11px] uppercase tracking-[0.2em] text-neutral-500 transition-colors duration-150 hover:text-neutral-200 font-semibold"
            >
              <Info className="h-3.5 w-3.5" />
              Details
            </button>

            {/* Watch providers */}
            {providers.length > 0 && (
              <>
                <div className="h-4 w-px bg-white/[0.12]" />
                <div className="flex items-center gap-2">
                  {providers.slice(0, 5).map((p) => (
                    <Link
                      key={p.provider_id}
                      href={PROVIDER_URLS[p.provider_id]?.(title) ?? providersLink ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={p.provider_name}
                      className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-xl opacity-75 shadow-[0_2px_12px_rgba(0,0,0,0.5)] transition-all duration-200 hover:opacity-100 hover:scale-[1.08] hover:shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w154${p.logo_path}`}
                        alt={p.provider_name}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Trailer countdown ring → mute toggle (after providers) */}
            {tKey && (
              <>
                <div className="h-4 w-px bg-white/[0.12]" />
                {!showVideo ? (
                  <div key={`circle-${idx}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] ring-1 ring-white/[0.12]">
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
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] text-white ring-1 ring-white/[0.12] transition-all duration-200 hover:bg-white/[0.12] hover:ring-white/[0.2]"
                  >
                    {muted ? (
                      <VolumeX className="h-[15px] w-[15px]" />
                    ) : (
                      <Volume2 className="h-[15px] w-[15px]" />
                    )}
                  </button>
                )}
              </>
            )}

            <div className="flex-1" />

            {/* Slide numbers */}
            <div className="flex items-center gap-6">
              {items.map((m, i) => {
                const active = i === idx;
                return (
                  <button
                    key={m.id}
                    onClick={() => goTo(i)}
                    aria-label={itemTitle(m)}
                    className="group flex flex-col items-center gap-[3px]"
                  >
                    <span
                      className={cn(
                        "font-space text-[13px] font-medium tabular-nums tracking-[0.04em] transition-colors duration-300",
                        active
                          ? "text-white"
                          : "text-neutral-500 group-hover:text-neutral-300",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="relative h-[1.5px] w-4 overflow-hidden rounded-full bg-white/15">
                      {active && (
                        <span
                          className="absolute inset-0 rounded-full bg-white"
                          style={{
                            animation: `progressTrack ${SLIDE_MS}ms linear forwards`,
                            transformOrigin: "left",
                          }}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </section>

      {/* ── Details modal ── */}
      {showModal &&
        (item.media_type === "tv" ? (
          <TvDetailsModal
            show={{
              id: item.id,
              name: title,
              overview: item.overview,
              backdrop_path: item.backdrop_path,
              genre_ids: item.genre_ids,
              vote_average: item.vote_average,
              first_air_date: itemDate(item),
            }}
            onClose={() => setShowModal(false)}
          />
        ) : (
          <MovieDetailsModal
            movie={{
              id: item.id,
              title,
              overview: item.overview,
              backdrop_path: item.backdrop_path,
              genre_ids: item.genre_ids,
              vote_average: item.vote_average,
              release_date: itemDate(item),
            }}
            providers={providers}
            onClose={() => setShowModal(false)}
          />
        ))}

      {/* ── Watch modal ── */}
      {showWatchModal && (
        item.media_type === "tv" ? (
          <TvWatchModal
            showId={item.id}
            showName={title}
            backdropPath={item.backdrop_path}
            logo={(info as Enriched).logo}
            seasons={(info as Enriched).seasons}
            rating={item.vote_average}
            year={itemDate(item)?.slice(0, 4) ?? null}
            onClose={() => setShowWatchModal(false)}
          />
        ) : (
          <WatchModal
            movie={{
              id: item.id,
              title,
              backdrop_path: item.backdrop_path,
              vote_average: item.vote_average,
              release_date: itemDate(item),
            }}
            logo={(info as Enriched).logo}
            runtimeLabel={rtStr}
            genres={genres}
            onClose={() => setShowWatchModal(false)}
          />
        )
      )}

      {/* ══════════════════  MOBILE / TABLET  ══════════════════ */}
      <section className="relative lg:hidden">
        {/* ─── Full-bleed image wrapper ─── */}
        <div
          className="relative overflow-hidden"
          style={{ height: "72vh", minHeight: "500px" }}
        >
          {/* Backdrop */}
          <img
            key={`mbg-${idx}`}
            src={`https://image.tmdb.org/t/p/w780${item.backdrop_path}`}
            alt=""
            aria-hidden
            className="h-full w-full object-cover object-center"
            style={{ animation: "fade-in-up 0.7s ease-out both" }}
          />

          {/* Trailer */}
          {tSrc && showVideo && (
            <div className="absolute inset-0 animate-trailer-reveal">
              <iframe
                src={tSrc}
                allow="autoplay; encrypted-media"
                className="absolute inset-0 h-full w-full"
                style={{
                  border: "none",
                  pointerEvents: "none",
                  transform: "scale(1.4)",
                }}
              />
            </div>
          )}

          {/* Header safe-area gradient (top) */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28"
            style={{
              background:
                "linear-gradient(to bottom, rgba(1,1,1,0.55) 0%, transparent 100%)",
            }}
          />

          {/* Bottom gradient */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(1,1,1,1) 0%, rgba(1,1,1,0.85) 18%, rgba(1,1,1,0.35) 48%, rgba(1,1,1,0.08) 68%, transparent 82%)",
            }}
          />


          {/* ─── Bottom content overlay ─── */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 md:px-8 md:pb-8">
            {/* Slide progress bars */}
            <div
              key={`indicators-${idx}`}
              className="mb-5 flex items-center gap-1.5"
            >
              {items.map((m, i) => {
                const active = i === idx;
                return (
                  <button
                    key={m.id}
                    onClick={() => goTo(i)}
                    aria-label={itemTitle(m)}
                    className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-white/[0.22]"
                  >
                    {active && (
                      <span
                        className="absolute inset-0 rounded-full bg-white"
                        style={{
                          animation: `progressTrack ${SLIDE_MS}ms linear forwards`,
                          transformOrigin: "left",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Genre tags */}
            {genres.length > 0 && (
              <div className="mb-3 flex items-center gap-2.5">
                {item.media_type === "tv" && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-manrope text-[9px] uppercase tracking-[0.12em] text-white/70">
                    Series
                  </span>
                )}
                {genres.map((g, i) => (
                  <span key={g.id} className="flex items-center gap-2.5">
                    {i > 0 && <span className="text-white/25">·</span>}
                    <Link
                      href={`/movie?genre=${g.id}`}
                      className="font-manrope text-[9px] uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-white"
                    >
                      {g.name}
                    </Link>
                  </span>
                ))}
              </div>
            )}

            {/* Title / Logo */}
            <div className="mb-4" key={`mtitle-${idx}`}>
              {(info as Enriched).logo ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${(info as Enriched).logo}`}
                  alt={title}
                  className="max-h-20 w-auto max-w-[260px] object-contain drop-shadow-[0_2px_20px_rgba(0,0,0,0.98)] md:max-h-[6rem] md:max-w-[360px]"
                />
              ) : !(info as Enriched).logoFetched ? (
                <div className="h-10 w-48 animate-pulse bg-white/[0.07]" />
              ) : (
                <h1
                  className="font-nichrome font-black leading-[0.88] text-white uppercase tracking-tight"
                  style={{
                    fontSize: "clamp(2.6rem, 10vw, 4rem)",
                    textShadow: "0 2px 30px rgba(0,0,0,0.95)",
                  }}
                >
                  {title}
                </h1>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWatchModal(true)}
                className="flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 font-manrope text-[15px] font-bold text-black shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition-all duration-150 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-black" />
                Watch Now
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 rounded-full border border-white/[0.22] bg-black/30 px-4 py-2.5 font-manrope text-[15px] font-semibold text-white transition-colors hover:bg-black/50"
              >
                <Info className="h-3.5 w-3.5" />
                Details
              </button>
              {tKey && showVideo && (
                <button
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-white/[0.22] bg-black/30 text-white transition-all duration-200 active:scale-90"
                >
                  {muted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ─── Below-image content ─── */}
        <div className="bg-[#010101] px-5 pb-5 pt-4 md:px-8 md:pb-6 md:pt-5">
          {/* Meta strip */}
          <div className="mb-3 flex items-center gap-3 font-manrope text-[13px] tracking-wide text-neutral-500">
            <span className="text-[14px] font-bold text-[#4ade80]">
              ★ {item.vote_average.toFixed(1)}
            </span>
            {year && (
              <>
                <span className="text-neutral-800">·</span>
                <span>{year}</span>
              </>
            )}
            {rtStr && (
              <>
                <span className="text-neutral-800">·</span>
                <span>{rtStr}</span>
              </>
            )}
          </div>

          {/* Overview */}
          <p className="mb-4 text-[14px] leading-[1.75] text-neutral-400 line-clamp-2 md:text-[16px]">
            {item.overview}
          </p>

          {/* Cast */}
          {cast.length > 0 && (
            <div className="mb-4 flex items-center gap-3.5">
              <span className="shrink-0 font-manrope text-[8px] uppercase tracking-[0.2em] text-neutral-700">
                With
              </span>
              <div className="h-3 w-px bg-white/[0.08]" />
              {cast.map((c) => (
                <Link
                  key={c.id}
                  href={`/person/${c.id}`}
                  className="group flex items-center gap-1.5"
                >
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-neutral-800 ring-1 ring-white/[0.1] transition-opacity group-hover:opacity-75">
                    {c.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w45${c.profile_path}`}
                        alt={c.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-manrope text-[7px] text-neutral-600">
                        {c.name[0]}
                      </div>
                    )}
                  </div>
                  <span className="hidden font-manrope text-[11px] text-neutral-400 transition-colors group-hover:text-neutral-200 sm:block">
                    {c.name.split(" ")[0]}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Watch providers */}
          {providers.length > 0 && (
            <div className="flex items-center gap-2.5">
              <span className="font-manrope text-[8px] uppercase tracking-[0.18em] text-neutral-700">
                On
              </span>
              <div className="flex items-center gap-1.5">
                {providers.slice(0, 5).map((p) => (
                  <div
                    key={p.provider_id}
                    title={p.provider_name}
                    className="h-[26px] w-[26px] overflow-hidden rounded-[5px] ring-1 ring-white/[0.1]"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                      alt={p.provider_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
