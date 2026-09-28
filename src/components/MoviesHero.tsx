"use client";

import HeroSlideIndicator, { ReelCueMark } from "@/components/HeroSlideIndicator";
import { useTrailerLayout } from "@/lib/useTrailerLayout";
import { youtubeEmbedUrl } from "@/lib/youtube";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from "react";
import Link from "next/link";
import AudienceRating from "@/components/AudienceRating";
import { useRouter } from "next/navigation";
import { Play, Volume2, VolumeX, Info } from "lucide-react";
import WatchModal from "./WatchModal";
import GenrePicker from "./GenrePicker";
import { GENRE_LIST, GENRE_NAMES } from "@/lib/genres";
import { cn, heroTitleSize } from "@/lib/utils";
import { useTrailerGuard } from "@/lib/trailer-guard";
import { fetchJson } from "@/lib/client-api";
import { useWatchProviders } from "@/lib/useWatchProviders";

const SLIDE_MS = 40000;

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

/* Stable identity — a fresh [] each render would make the "did the list
   change?" check below true forever, and it adjusts state during render. */
const NO_MOVIES: Movie[] = [];

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

interface Movie {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  genre_ids: number[];
  vote_average: number;
  release_date: string;
}

interface CastMember {
  id: number;
  name: string;
  profile_path: string | null;
}

interface Enriched {
  logo: string | null;
  logoFetched: boolean;
  trailerKey: string | null;
  runtime: number | null;
  cast: CastMember[];
  director: string | null;
  directorId: number | null;
}


interface Props {
  initialMovies: Movie[];
  genreId?: string;
  genreName?: string;
}

export default function MoviesHero({ initialMovies, genreId }: Props) {
  const trailerLayout = useTrailerLayout();
  const router = useRouter();
  /* Read straight from props: this list changes when the genre filter
     navigates, and holding it in state would pin the hero to whatever the
     first render happened to receive. The page guarantees it is non-empty. */
  const movies = initialMovies.length ? initialMovies : NO_MOVIES;
  const [idx, setIdx] = useState(0);
  const { providers, providersLink } = useWatchProviders(movies[idx]?.id, "movie");
  /* Previous backdrop stays mounted underneath so a slide change dissolves
     instead of cutting to black for an instant. */
  const [bgFrontId, setBgFrontId] = useState<number | null>(null);
  const [bgFront, setBgFront] = useState<Movie | null>(null);
  const [bgBack, setBgBack] = useState<Movie | null>(null);
  const [shownList, setShownList] = useState(movies);
  const [enriched, setEnriched] = useState<Record<number, Enriched>>({});
  const [showVideo, setShowVideo] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showWatch, setShowWatch] = useState(false);
  const [pending, startTransition] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enrichRequested = useRef(new Set<number>());
  useEffect(() => {
    const targets = [movies[idx], movies[(idx + 1) % movies.length]].filter(
      item => item && !enrichRequested.current.has(item.id),
    );
    targets.forEach(({ id }) => {
      enrichRequested.current.add(id);
      fetchJson(`/api/getMovieDetailsEnhanced?id=${id}`)
        .then((res) => {
          const directorEntry = (res.credits?.crew ?? []).find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => c.job === "Director",
          );
          setEnriched((p) => ({
            ...p,
            [id]: {
              logo: res.logo ?? null,
              logoFetched: true,
              trailerKey: res.trailerKey ?? null,
              runtime: res.data?.runtime ?? null,
              cast: (res.credits?.cast ?? []).slice(0, 4),
              director: directorEntry?.name ?? null,
              directorId: directorEntry?.id ?? null,
            },
          }));
        })
        .catch(() => {
          enrichRequested.current.delete(id);
          setEnriched((p) => ({
            ...p,
            [id]: {
              logo: null,
              logoFetched: true,
              trailerKey: null,
              runtime: null,
              cast: [],
              director: null,
              directorId: null,
            },
          }));
        });
    });
  }, [movies, idx]);

  const goTo = useCallback((i: number) => {
    setIdx(i);
    setShowVideo(false);
    setMuted(true);
  }, []);

  /* A new list arrived (the genre filter navigated) — restart the carousel
     instead of leaving it parked on an index from the previous list.
     Adjusted during render, which React re-runs before committing, rather
     than in an effect that would paint the stale slide first. */
  if (shownList !== movies) {
    setShownList(movies);
    setIdx(0);
    setShowVideo(false);
    setMuted(true);
  }


  useEffect(() => {
    if (!movies.length || showWatch) return;
    const t = setInterval(() => goTo((idx + 1) % movies.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [idx, movies.length, goTo, showWatch]);

  /* current slide's trailer key — null until enrichment resolves */
  const activeTrailerKey = movies[idx]
    ? (enriched[movies[idx].id]?.trailerKey ?? null)
    : null;

  /* A geo-blocked trailer paints YouTube's own "Video unavailable" card
     inside the frame; drop back to the backdrop still instead. Called
     here, above the empty-list early return, so the hook order holds. */
  const trailerBlocked = useTrailerGuard(
    iframeRef,
    showVideo && !!trailerLayout,
    `${activeTrailerKey}:${trailerLayout}`,
  );

  /* ── video reveal — start the 6s countdown only once the trailer key is
        known, so the progress ring and the reveal stay perfectly in sync ── */
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!activeTrailerKey) return;
    timerRef.current = setTimeout(() => setShowVideo(true), 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, activeTrailerKey]);


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

  const movie = movies[idx];
  if (movie && movie.id !== bgFrontId) {
    setBgBack(bgFront);
    setBgFront(movie);
    setBgFrontId(movie.id);
  }
  /* No hero titles (an empty genre, or the server-side fetch failed) — render
     nothing and let the reels start at the top, rather than holding a
     full-screen black block that reads as a broken page. */
  if (!movie) return null;

  const info = (enriched[movie.id] ?? {}) as Partial<Enriched>;
  const genres = movie.genre_ids
    .slice(0, 4)
    .map((id) => ({ id, name: GENRE_MAP[id] }))
    .filter((g) => g.name);
  const year = movie.release_date?.slice(0, 4);
  const rt = (info as Enriched).runtime;
  const rtStr = rt ? `${Math.floor(rt / 60)}h ${rt % 60}m` : null;
  const cast = (info as Enriched).cast ?? [];
  const tKey = (info as Enriched).trailerKey;
  const tSrc = tKey && !trailerBlocked
    ? youtubeEmbedUrl(tKey, true)
    : null;

  /* Genre filter is a comma-separated list — "28,27" is Action *and* Horror,
     which is exactly what TMDB's with_genres takes. */
  const selectedGenres = genreId ? genreId.split(",").filter(Boolean) : [];

  /* startTransition keeps `pending` true for the whole navigation — the
     server re-renders the page with the new genre and streams fresh props
     back — so the hero can dissolve out and back in instead of snapping. */
  const applyGenres = (next: string[]) =>
    startTransition(() =>
      router.push(next.length ? `/films?genre=${next.join(",")}` : "/films"),
    );

  /* Any selected id the standard list doesn't carry (a TV genre arrived via
     a cross-link, say) still needs a row to toggle it back off. */
  const genreOptions = [
    ...selectedGenres
      .filter((id) => !GENRE_LIST.some((g) => g.id === id))
      .map((id) => ({ id, name: GENRE_NAMES[id] ?? "Genre" })),
    ...GENRE_LIST,
  ];

  /* The whole hero dissolves while a genre change is in flight. The menu is
     portaled outside this subtree, so it stays sharp above the dissolve. */
  const swapping = cn(
    "transition-[opacity,filter] duration-500 ease-out motion-reduce:transition-none",
    pending ? "opacity-40 blur-[6px]" : "opacity-100 blur-0",
  );

  return (
    <>
      {/* ══════════════════  DESKTOP  ══════════════════ */}
      <section
        className={cn(
          "relative hidden h-screen overflow-hidden lg:block",
          swapping,
        )}
      >
        <ReelCueMark key={idx} durationMs={SLIDE_MS} />
        {/* Backdrop — cinematic cross-dissolve: the new frame blooms in over
            the previous one as it eases back into a soft, dim blur */}
        <div className="absolute inset-0 overflow-hidden">
          {bgBack?.backdrop_path && (
            <img
              key={`bgback-${bgBack.id}`}
              src={`https://image.tmdb.org/t/p/original${bgBack.backdrop_path}`}
              alt=""
              aria-hidden
              className="animate-recede absolute inset-0 h-full w-full object-cover object-center"
            />
          )}
          {bgFront?.backdrop_path && (
            <div
              key={`bgfront-${bgFront.id}-${idx}`}
              className="animate-cinematic-in absolute inset-0 overflow-hidden"
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
        {tSrc && showVideo && trailerLayout === "desktop" && (
          <div
            className={cn(
              "absolute inset-0 z-0",
              showVideo ? "animate-trailer-reveal" : "opacity-0",
            )}
          >
            <iframe
              referrerPolicy="strict-origin-when-cross-origin"
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
            <div className="pointer-events-none absolute inset-0 bg-transparent" />
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

        {/* Content block */}
        <div
          className="absolute inset-x-(--gutter) bottom-9 z-20"
          style={{
            animation: "fade-in-up 0.55s 0.1s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {/* Logo / Title */}
          <div
            key={`title-${movie.id}`}
            className="pb-4"
            style={{
              animation: "fade-in-up 0.5s 0s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
              {(info as Enriched).logo ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${(info as Enriched).logo}`}
                  alt={movie.title}
                  className="max-h-[11rem] w-auto max-w-[560px] object-contain drop-shadow-[0_2px_30px_rgba(0,0,0,0.95)]"
                />
              ) : !(info as Enriched).logoFetched ? (
                <div className="h-[80px] w-[460px] animate-pulse bg-white/[0.06]" />
              ) : (
                <h1
                  className="max-w-[16ch] text-balance font-manrope font-bold leading-[1.02] text-white uppercase tracking-tight"
                  style={{
                    fontSize: heroTitleSize(movie.title),
                    textShadow:
                      "0 2px 40px rgba(0,0,0,0.95), 0 0 80px rgba(0,0,0,0.6)",
                  }}
                >
                  {movie.title}
                </h1>
              )}
          </div>

          {/* Meta strip */}
          <div
            key={`meta-${movie.id}`}
            className="mb-4 flex items-center gap-2.5 font-manrope text-[14px] text-neutral-400"
            style={{
              textShadow: "0 1px 16px rgba(0,0,0,0.95)",
              animation: "fade-in-up 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <AudienceRating value={movie.vote_average} prominent />
            {year && (
              <>
                <span className="text-white/[0.22]">•</span>
                <span className="font-space">{year}</span>
              </>
            )}
            {rtStr ? (
              <>
                <span className="text-white/[0.22]">•</span>
                <span className="font-space">{rtStr}</span>
              </>
            ) : !(info as Enriched).logoFetched ? (
              <>
                <span className="text-white/[0.22]">•</span>
                <span className="inline-block h-3 w-12 animate-pulse rounded-sm bg-white/10" />
              </>
            ) : null}
            {genres.length > 0 && (
              <>
                <span className="text-white/[0.22]">•</span>
                <span>
                  {genres.map((g, i) => (
                    <span key={g.id}>
                      {i > 0 && <span className="text-neutral-500">, </span>}
                      <Link prefetch={false}
                        href={`/films?genre=${g.id}`}
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

          {/* Overview */}
          <p
            key={`ov-${movie.id}`}
            className="mb-4 max-w-[52ch] text-[16px] leading-[1.7] text-neutral-300/90 line-clamp-2"
            style={{
              animation:
                "fade-in-up 0.5s 0.06s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            {movie.overview}
          </p>

          {/* Starring */}
          {cast.length > 0 && (
            <div
              key={`cast-${movie.id}`}
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
                  <Link prefetch={false}
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

          {/* Action bar + slide numbers */}
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

            <div className="h-4 w-px bg-white/[0.1]" />

            <Link prefetch={false}
              href={`/films/${movie.id}`}
              className="flex items-center gap-1.5 font-manrope text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 transition-colors duration-150 hover:text-neutral-200"
            >
              <Info className="h-3.5 w-3.5" />
              Details
            </Link>

            {tSrc && (
              <>
                <div className="h-4 w-px bg-white/[0.12]" />
                {!showVideo ? (
                  <div
                    key={`circle-${idx}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] ring-1 ring-white/[0.12]"
                  >
                    <svg
                      className="h-[22px] w-[22px] -rotate-90"
                      viewBox="0 0 36 36"
                    >
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="var(--color-brand, #e50914)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="94.25"
                        strokeDashoffset="94.25"
                        style={{
                          animation: `showreel-circle 6000ms linear forwards`,
                        }}
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

            {/* Genre picker — last stop on the action bar */}
            <div className="h-4 w-px bg-white/[0.12]" />
            <GenrePicker
              selected={selectedGenres}
              options={genreOptions}
              align="start"
              allLabel="All Movies"
              onApply={applyGenres}
            />
          </div>

          {/* Created by + slide numbers inline */}
          <div
            className="flex items-center gap-2.5 pb-6"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.95)" }}
          >
            {(info as Enriched).director && (
              <>
                <span className="shrink-0 font-manrope text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                  Created by
                </span>
                {(info as Enriched).directorId ? (
                  <Link prefetch={false}
                    href={`/person/${(info as Enriched).directorId}`}
                    className="font-manrope text-[13px] text-neutral-400 transition-colors duration-150 hover:text-white"
                  >
                    {(info as Enriched).director}
                  </Link>
                ) : (
                  <span className="font-manrope text-[13px] text-neutral-400">
                    {(info as Enriched).director}
                  </span>
                )}
              </>
            )}

            {/* Where to watch — a credit, not an action, so it sits on the
                credits line rather than competing with Watch Now. */}
            {providers.length > 0 && (
              <>
                {(info as Enriched).director && (
                  <div className="mx-1 h-3 w-px shrink-0 bg-white/[0.1]" />
                )}
                <span className="shrink-0 font-manrope text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                  On
                </span>
                <div className="flex items-center gap-1.5">
                  {providers.slice(0, 5).map((p) => (
                    <Link prefetch={false}
                      key={p.provider_id}
                      href={
                        PROVIDER_URLS[p.provider_id]?.(movie.title) ??
                        providersLink ??
                        "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      title={p.provider_name}
                      className="h-[26px] w-[26px] shrink-0 overflow-hidden rounded-[6px] opacity-70 ring-1 ring-white/[0.08] transition-all duration-200 hover:opacity-100 hover:ring-white/[0.2]"
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                        alt={p.provider_name}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="flex-1" />

            <HeroSlideIndicator labels={movies.map(m => m.title)} active={idx} durationMs={SLIDE_MS} onSelect={goTo} />
          </div>
        </div>
      </section>

      {/* ══════════════════  MOBILE / TABLET  ══════════════════ */}
      <section className={cn("relative lg:hidden", swapping)}>
        <div
          className="relative overflow-hidden"
          style={{ height: "72vh", minHeight: "500px" }}
        >
          {movie.backdrop_path && (
            <img
              key={`mbg-${movie.id}`}
              src={`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`}
              alt=""
              aria-hidden
              className="h-full w-full object-cover object-center"
              style={{ animation: "fade-in-up 0.7s ease-out both" }}
            />
          )}

          {tSrc && showVideo && trailerLayout === "mobile" && (
            <div className="absolute inset-0 animate-trailer-reveal">
              <iframe
                referrerPolicy="strict-origin-when-cross-origin"
                ref={iframeRef}
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

          <div className="absolute bottom-0 left-0 right-0 px-(--gutter) pb-6 md:pb-8">
            {/* Progress bars */}
            <div
              key={`indicators-${idx}`}
              className="mb-5 flex items-center gap-1.5"
            >
              {movies.map((m, i) => {
                const active = i === idx;
                return (
                  <button
                    key={m.id}
                    onClick={() => goTo(i)}
                    aria-label={m.title}
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

            {/* Genre picker */}
            <div className="mb-4 flex justify-end">
              <GenrePicker
                selected={selectedGenres}
                options={genreOptions}
                align="end"
                allLabel="All Movies"
                onApply={applyGenres}
              />
            </div>

            {/* Genre tags */}
            {genres.length > 0 && (
              <div className="mb-3 flex items-center gap-2.5">
                <span className="rounded-full bg-white/10 px-2 py-0.5 font-manrope text-[9px] uppercase tracking-[0.12em] text-white/70">
                  Movie
                </span>
                {genres.slice(0, 2).map((g, i) => (
                  <span key={g.id} className="flex items-center gap-2.5">
                    {i > 0 && <span className="text-white/25">·</span>}
                    <Link prefetch={false}
                      href={`/films?genre=${g.id}`}
                      className="font-manrope text-[9px] uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-white"
                    >
                      {g.name}
                    </Link>
                  </span>
                ))}
              </div>
            )}

            {/* Logo / Title */}
            <div className="mb-4" key={`mtitle-${movie.id}`}>
              {(info as Enriched).logo ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${(info as Enriched).logo}`}
                  alt={movie.title}
                  className="max-h-20 w-auto max-w-[260px] object-contain drop-shadow-[0_2px_20px_rgba(0,0,0,0.98)] md:max-h-[6rem] md:max-w-[360px]"
                />
              ) : !(info as Enriched).logoFetched ? (
                <div className="h-10 w-48 animate-pulse bg-white/[0.07]" />
              ) : (
                <h1
                  className="max-w-[16ch] text-balance font-manrope font-bold leading-[1.02] text-white uppercase tracking-tight"
                  style={{
                    fontSize: heroTitleSize(movie.title, "compact"),
                    textShadow: "0 2px 30px rgba(0,0,0,0.95)",
                  }}
                >
                  {movie.title}
                </h1>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWatch(true)}
                className="flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 font-manrope text-[15px] font-bold text-black shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition-all duration-150 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-black" />
                Watch Now
              </button>
              <Link prefetch={false}
                href={`/films/${movie.id}`}
                className="flex items-center gap-2 rounded-full border border-white/[0.22] bg-black/30 px-4 py-2.5 font-manrope text-[15px] font-semibold text-white transition-colors hover:bg-black/50"
              >
                <Info className="h-3.5 w-3.5" />
                Details
              </Link>
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

        {/* Below-image */}
        <div className="bg-[#010101] px-(--gutter) pb-5 pt-4 md:pb-6 md:pt-5">
          <div className="mb-3 flex items-center gap-3 font-manrope text-[13px] tracking-wide text-neutral-500">
            <AudienceRating value={movie.vote_average} prominent />
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
            {movie.overview}
          </p>

          {/* Created by */}
          {(info as Enriched).director && (
            <div className="mb-3 flex items-baseline gap-2.5">
              <span className="shrink-0 font-manrope text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                Created by
              </span>
              {(info as Enriched).directorId ? (
                <Link prefetch={false}
                  href={`/person/${(info as Enriched).directorId}`}
                  className="font-manrope text-[12px] text-neutral-400 transition-colors hover:text-white"
                >
                  {(info as Enriched).director}
                </Link>
              ) : (
                <span className="font-manrope text-[12px] text-neutral-400">
                  {(info as Enriched).director}
                </span>
              )}
            </div>
          )}

          {/* Starring */}
          {cast.length > 0 && (
            <div className="mb-4 flex items-start gap-3.5">
              <span className="shrink-0 font-manrope text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                Starring
              </span>
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                {cast.map((c, i) => (
                  <Link prefetch={false}
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
                  <Link prefetch={false}
                    key={p.provider_id}
                    href={
                      PROVIDER_URLS[p.provider_id]?.(movie.title) ??
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
            id: movie.id,
            title: movie.title,
            backdrop_path: movie.backdrop_path,
            vote_average: movie.vote_average,
            release_date: movie.release_date,
          }}
          logo={(info as Enriched).logo}
          runtimeLabel={rtStr}
          genres={genres}
          onClose={() => setShowWatch(false)}
        />
      )}
    </>
  );
}
