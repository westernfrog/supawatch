"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import WatchModal from "./WatchModal";
import { fetchJson } from "@/lib/client-api";

const PROVIDER_URLS: Record<number, (title: string) => string> = {
  8: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  9: (t) =>
    `https://www.amazon.com/gp/video/search?phrase=${encodeURIComponent(t)}`,
  10: (t) =>
    `https://www.amazon.com/gp/video/search?phrase=${encodeURIComponent(t)}`,
  15: (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,
  337: (t) => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}`,
  350: () => `https://tv.apple.com/`,
  384: (t) => `https://www.max.com/search?q=${encodeURIComponent(t)}`,
  386: (t) => `https://www.peacocktv.com/watch/search/${encodeURIComponent(t)}`,
  387: (t) => `https://www.peacocktv.com/watch/search/${encodeURIComponent(t)}`,
  531: (t) => `https://www.paramountplus.com/search/${encodeURIComponent(t)}/`,
  507: (t) => `https://mubi.com/en/search/${encodeURIComponent(t)}`,
  192: (t) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`,
  619: (t) => `https://www.britbox.com/search?q=${encodeURIComponent(t)}`,
  283: (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  37: (t) => `https://www.fubo.tv/welcome/search?q=${encodeURIComponent(t)}`,
  209: (t) => `https://www.shudder.com/search?q=${encodeURIComponent(t)}`,
};

interface CastMember {
  id: number;
  name: string;
  profile_path: string | null;
}

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface Props {
  showId: number;
  showName: string;
  overview: string;
  backdropPath: string | null;
  logo: string | null;
  trailerKey: string | null;
  genres: { id: number; name: string }[];
  cast: CastMember[];
  rating: number;
  year: string | null;
  runtimeLabel: string | null;
  status: string | null;
  director: string | null;
  directorId: number | null;
}

export default function MoviePageHero({
  showId,
  showName,
  overview,
  backdropPath,
  logo,
  trailerKey,
  genres,
  cast,
  rating,
  year,
  runtimeLabel,
  status,
  director,
  directorId,
}: Props) {
  const [showVideo, setShowVideo] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showWatch, setShowWatch] = useState(false);
  const [region, setRegion] = useState("US");
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [providersLink, setProvidersLink] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setShowVideo(true), 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    fetchJson<{ region?: string }>("/api/getRegion", { ttlMs: 60 * 1000 })
      .then(({ region: r }) => setRegion(r ?? "US"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchJson(`/api/getWatchProviders?id=${showId}&region=${region}&media_type=movie`)
      .then((res) => {
        setProviders(res.providers ?? []);
        setProvidersLink(res.link ?? null);
      })
      .catch(() => {});
  }, [showId, region]);

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

  const tSrc = trailerKey
    ? `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&loop=1&playlist=${trailerKey}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&enablejsapi=1&vq=hd1080`
    : null;

  return (
    <>
      {/* ══════════════════  DESKTOP  ══════════════════ */}
      <section className="relative hidden h-screen overflow-hidden lg:block">
        {/* Backdrop */}
        {backdropPath && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={`https://image.tmdb.org/t/p/original${backdropPath}`}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{
                animation: "ken-burns 22s ease-in-out infinite alternate",
              }}
            />
          </div>
        )}

        {/* YouTube trailer */}
        {tSrc && (
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              showVideo ? "opacity-100" : "opacity-0",
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
          {/* Logo / Title */}
          <div
            className="pb-4"
            style={{
              animation: "fade-in-up 0.5s 0s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            {logo ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${logo}`}
                alt={showName}
                className="max-h-[11rem] w-auto max-w-[560px] object-contain drop-shadow-[0_2px_30px_rgba(0,0,0,0.95)]"
              />
            ) : (
              <h1
                className="font-nichrome font-black leading-[0.88] text-white uppercase tracking-tight"
                style={{
                  fontSize: "clamp(4rem, 6vw, 8rem)",
                  textShadow:
                    "0 2px 40px rgba(0,0,0,0.95), 0 0 80px rgba(0,0,0,0.6)",
                }}
              >
                {showName}
              </h1>
            )}
          </div>

          {/* Meta strip */}
          <div
            className="mb-4 flex items-center gap-2.5 font-manrope text-[14px] text-neutral-400"
            style={{
              textShadow: "0 1px 16px rgba(0,0,0,0.95)",
              animation: "fade-in-up 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <span className="flex items-center gap-1.5 font-space text-[14px] font-bold text-[#4ade80]">
              ★ {rating.toFixed(1)}
            </span>
            {year && (
              <>
                <span className="text-white/[0.22]">•</span>
                <span className="font-space">{year}</span>
              </>
            )}
            {runtimeLabel && (
              <>
                <span className="text-white/[0.22]">•</span>
                <span className="font-space">{runtimeLabel}</span>
              </>
            )}
            {status && (
              <>
                <span className="text-white/[0.22]">•</span>
                <span className="font-space text-[14px] text-neutral-400">{status}</span>
              </>
            )}
            {genres.length > 0 && (
              <>
                <span className="text-white/[0.22]">•</span>
                <span>
                  {genres.map((g, i) => (
                    <span key={g.id}>
                      {i > 0 && <span className="text-neutral-500">, </span>}
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

          {/* Starring */}
          {cast.length > 0 && (
            <div
              className="flex items-center gap-4 pb-4"
              style={{
                animation:
                  "fade-in-up 0.5s 0.16s cubic-bezier(0.16,1,0.3,1) both",
                textShadow: "0 1px 16px rgba(0,0,0,0.95)",
              }}
            >
              <span className="shrink-0 font-manrope text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                Starring
              </span>
              <div className="flex items-center gap-3">
                {cast.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/person/${c.id}`}
                    className="group flex items-center gap-2"
                  >
                    <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-neutral-800 ring-1 ring-white/[0.1] transition-opacity duration-150 group-hover:opacity-80">
                      {c.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w45${c.profile_path}`}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-manrope text-[8px] text-neutral-600">
                          {c.name[0]}
                        </div>
                      )}
                    </div>
                    <span className="font-manrope text-[13px] text-neutral-300 transition-colors duration-150 group-hover:text-white">
                      {c.name}
                    </span>
                    {i < cast.length - 1 && (
                      <span className="ml-1 text-neutral-700">,</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-5 pb-7 pt-2">
            <button
              onClick={() => setShowWatch(true)}
              className="group flex items-center gap-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white transition-all duration-200 group-hover:scale-[1.07] group-hover:shadow-[0_0_28px_rgba(255,255,255,0.15)]">
                <Play className="ml-0.5 h-[17px] w-[17px] fill-black text-black" />
              </div>
              <span className="font-manrope text-[15px] font-bold tracking-[0.01em] text-white">
                Watch Now
              </span>
            </button>

            {/* Watch providers */}
            {providers.length > 0 && (
              <>
                <div className="h-4 w-px bg-white/[0.12]" />
                <div className="flex items-center gap-2">
                  {providers.slice(0, 5).map((p) => (
                    <Link
                      key={p.provider_id}
                      href={
                        PROVIDER_URLS[p.provider_id]?.(showName) ??
                        providersLink ??
                        "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      title={p.provider_name}
                      className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-xl opacity-75 shadow-[0_2px_12px_rgba(0,0,0,0.5)] transition-all duration-200 hover:scale-[1.08] hover:opacity-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
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

            {/* Mute */}
            {tSrc && (
              <>
                <div className="h-4 w-px bg-white/[0.12]" />
                {!showVideo ? (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] ring-1 ring-white/[0.12]">
                    <svg className="h-[22px] w-[22px] -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
                      <circle
                        cx="18" cy="18" r="15" fill="none" stroke="var(--color-brand, #e50914)" strokeWidth="2.5"
                        strokeLinecap="round" strokeDasharray="94.25" strokeDashoffset="94.25"
                        style={{ animation: `showreel-circle 5000ms linear forwards` }}
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
          </div>

          {/* Director */}
          {director && (
            <div
              className="flex items-baseline gap-2.5 pb-6"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.95)" }}
            >
              <span className="shrink-0 font-manrope text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                Created by
              </span>
              {directorId ? (
                <Link
                  href={`/person/${directorId}`}
                  className="font-manrope text-[13px] text-neutral-400 transition-colors duration-150 hover:text-white"
                >
                  {director}
                </Link>
              ) : (
                <span className="font-manrope text-[13px] text-neutral-400">
                  {director}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════  MOBILE / TABLET  ══════════════════ */}
      <section className="relative lg:hidden">
        <div
          className="relative overflow-hidden"
          style={{ height: "72vh", minHeight: "500px" }}
        >
          {backdropPath && (
            <img
              src={`https://image.tmdb.org/t/p/w780${backdropPath}`}
              alt=""
              aria-hidden
              className="h-full w-full object-cover object-center"
            />
          )}

          {tSrc && showVideo && (
            <div className="absolute inset-0">
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

          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28"
            style={{
              background:
                "linear-gradient(to bottom, rgba(1,1,1,0.55) 0%, transparent 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(1,1,1,1) 0%, rgba(1,1,1,0.85) 18%, rgba(1,1,1,0.35) 48%, rgba(1,1,1,0.08) 68%, transparent 82%)",
            }}
          />

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 md:px-8 md:pb-8">
            {genres.length > 0 && (
              <div className="mb-3 flex items-center gap-2.5">
                <span className="rounded-full bg-white/10 px-2 py-0.5 font-manrope text-[9px] uppercase tracking-[0.12em] text-white/70">
                  Movie
                </span>
                {genres.slice(0, 2).map((g, i) => (
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

            {status && status !== "Released" && (
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 backdrop-blur-md"
                style={{ textShadow: "none" }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                </span>
                <span className="font-manrope text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400">
                  {status}
                </span>
              </div>
            )}

            <div className="mb-4">
              {logo ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${logo}`}
                  alt={showName}
                  className="max-h-20 w-auto max-w-[260px] object-contain drop-shadow-[0_2px_20px_rgba(0,0,0,0.98)] md:max-h-[6rem] md:max-w-[360px]"
                />
              ) : (
                <h1
                  className="font-nichrome font-black leading-[0.88] text-white uppercase tracking-tight"
                  style={{
                    fontSize: "clamp(2.6rem, 10vw, 4rem)",
                    textShadow: "0 2px 30px rgba(0,0,0,0.95)",
                  }}
                >
                  {showName}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWatch(true)}
                className="flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 font-manrope text-[15px] font-bold text-black shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition-all duration-150 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-black" />
                Watch Now
              </button>
              {tSrc && showVideo && (
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

        {/* Below-image */}
        <div className="bg-[#010101] px-5 pb-5 pt-4 md:px-8 md:pb-6 md:pt-5">
          <div className="mb-3 flex items-center gap-3 font-manrope text-[13px] tracking-wide text-neutral-500">
            <span className="text-[14px] font-bold text-[#4ade80]">
              ★ {rating.toFixed(1)}
            </span>
            {year && (
              <>
                <span className="text-neutral-800">·</span>
                <span>{year}</span>
              </>
            )}
            {runtimeLabel && (
              <>
                <span className="text-neutral-800">·</span>
                <span>{runtimeLabel}</span>
              </>
            )}
          </div>

          {/* Starring */}
          {cast.length > 0 && (
            <div className="mb-4 flex items-center gap-3.5">
              <span className="shrink-0 font-manrope text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                Starring
              </span>
              <div className="flex items-center gap-2.5">
                {cast.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/person/${c.id}`}
                    className="group flex items-center gap-1.5"
                  >
                    <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-neutral-800 ring-1 ring-white/[0.1] transition-opacity group-hover:opacity-75">
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
                    <span className="font-manrope text-[12px] text-neutral-400 transition-colors group-hover:text-neutral-200">
                      {c.name.split(" ")[0]}
                    </span>
                    {i < cast.length - 1 && (
                      <span className="ml-0.5 text-neutral-700">,</span>
                    )}
                  </Link>
                ))}
              </div>
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
                  <Link
                    key={p.provider_id}
                    href={
                      PROVIDER_URLS[p.provider_id]?.(showName) ??
                      providersLink ??
                      "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    title={p.provider_name}
                    className="h-[26px] w-[26px] overflow-hidden rounded-[5px] ring-1 ring-white/[0.1] transition-opacity hover:opacity-80"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                      alt={p.provider_name}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {showWatch && (
        <WatchModal
          movie={{
            id: showId,
            title: showName,
            backdrop_path: backdropPath || "",
            vote_average: rating,
            release_date: year ? `${year}-01-01` : "",
          }}
          logo={logo}
          runtimeLabel={runtimeLabel}
          genres={genres}
          onClose={() => setShowWatch(false)}
        />
      )}
    </>
  );
}
