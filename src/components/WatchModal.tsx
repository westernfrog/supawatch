"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, Tv, MonitorPlay, Zap } from "lucide-react";
import gsap from "gsap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "@/lib/utils";
import { recordTaste, TASTE_WEIGHT } from "@/lib/taste";

export interface OriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Movie {
  id: number;
  title: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string;
}

interface Genre {
  id: number;
  name?: string;
}

interface Props {
  movie: Movie;
  logo?: string | null;
  runtimeLabel?: string | null;
  genres?: Genre[];
  /** Screen-space rect of the thumbnail that launched the modal — drives the
   *  cinematic expand-from-card open. */
  originRect?: OriginRect | null;
  /** Exact image URL the launching card already rendered (cached → instant). */
  posterSrc?: string | null;
  onClose: () => void;
}

const VF_PARAMS = "title=false&hideServer=true&autoPlay=true&chromecast=false&theme=e50914";
const VF_SUB_SERVERS = ["Mega", "vEdge", "vFast", "Beta", "Charlie", "Cobra", "Max"] as const;
type VfSubServer = (typeof VF_SUB_SERVERS)[number];

const SERVERS = [
  { id: "vf", name: "Titan", domain: "vidfast.pro",  path: "movie",       params: VF_PARAMS },
  { id: "s1", name: "Alpha",   domain: "vidsrcme.su",  path: "embed/movie", params: "" },
  { id: "s2", name: "Beta",    domain: "vidsrc-me.ru", path: "embed/movie", params: "" },
  { id: "s3", name: "Gamma",   domain: "vidsrc-me.su", path: "embed/movie", params: "" },
] as const;

type ServerId = (typeof SERVERS)[number]["id"];

function getServerSrc(server: ServerId, movieId: number, vfSub: VfSubServer): string {
  const s = SERVERS.find((x) => x.id === server);
  if (!s) return "";
  const extra = server === "vf" ? `&server=${vfSub}` : "";
  const query = s.params || extra ? `?${s.params}${extra}` : "";
  return `https://${s.domain}/${s.path}/${movieId}${query}`;
}

const HIDE_DELAY = 3000;

/* Shared control styling — soft glass pills with leading icons. */
const SELECT_TRIGGER =
  "flex h-11 w-fit items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-4 font-manrope text-[13px] font-medium text-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:bg-white/[0.09] focus-visible:border-white/25 focus-visible:ring-2 focus-visible:ring-white/15 data-[size=default]:h-11 data-[state=open]:border-white/25 data-[state=open]:bg-white/[0.1]";
const SELECT_CONTENT =
  "z-[400] min-w-[168px] rounded-xl border border-white/10 bg-[#0c0c0c]/95 p-1.5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.75)] backdrop-blur-2xl";
const SELECT_ITEM =
  "rounded-lg py-2 font-manrope text-[13px] text-white/70 focus:bg-white/[0.1] focus:text-white data-[state=checked]:text-white";
const TRIGGER_ICON = "size-4 shrink-0 text-white/40";
const ICON_BTN =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 shadow-[0_2px_10px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:bg-white/[0.1] hover:text-white";

export default function WatchModal({ movie, originRect, posterSrc, onClose }: Props) {
  /* Strongest taste signal — the user is pressing play. */
  useEffect(() => {
    recordTaste(
      {
        id: movie.id,
        media_type: "movie",
        title: movie.title,
        backdrop_path: movie.backdrop_path,
      },
      TASTE_WEIGHT.watch,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id]);

  const [server, setServer] = useState<ServerId>(SERVERS[0].id);
  const [vfSubServer, setVfSubServer] = useState<VfSubServer>(VF_SUB_SERVERS[0]);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLImageElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const expandSrc =
    posterSrc ??
    (movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  /* ── Cinematic open ──
     With an originRect, the launching thumbnail's image grows out of the reel
     and fills the screen, then the live player crossfades over it. Without one
     (e.g. a hero "Watch Now" button) it blooms up from centre. */
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set([bgRef.current, playerRef.current, headerRef.current], { opacity: 1, clearProps: "transform,filter" });
        if (expandRef.current) gsap.set(expandRef.current, { opacity: 0 });
        return;
      }

      const tl = gsap.timeline();

      if (originRect && expandRef.current) {
        tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0)
          .fromTo(
            expandRef.current,
            {
              top: originRect.top,
              left: originRect.left,
              width: originRect.width,
              height: originRect.height,
            },
            {
              top: 0,
              left: 0,
              width: window.innerWidth,
              height: window.innerHeight,
              duration: 0.62,
              ease: "power3.inOut",
            },
            0,
          )
          .fromTo(playerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: "power2.out" }, 0.46)
          .to(expandRef.current, { opacity: 0, duration: 0.4, ease: "power1.out" }, 0.78);
      } else {
        tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 0.32, ease: "power2.out" }, 0)
          .fromTo(
            playerRef.current,
            { opacity: 0, scale: 1.12, filter: "blur(26px) brightness(0.45)" },
            { opacity: 1, scale: 1, filter: "blur(0px) brightness(1)", duration: 0.9, ease: "power3.out" },
            0.05,
          );
      }

      tl.fromTo(
        headerRef.current,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" },
        originRect ? 0.5 : 0.4,
      );
    }, rootRef);

    return () => ctx.revert();
  }, [originRect]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) return; // let the browser exit fullscreen first
        onClose();
      } else if (e.key === "f" || e.key === "F") {
        const el = rootRef.current;
        if (!el) return;
        if (document.fullscreenElement) document.exitFullscreen?.();
        else el.requestFullscreen?.();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY);
  };

  const handleMouseMove = () => {
    setControlsVisible(true);
    scheduleHide();
  };

  useEffect(() => {
    scheduleHide();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const src = getServerSrc(server, movie.id, vfSubServer);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[300] overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* ── Black stage ── */}
      <div ref={bgRef} className="absolute inset-0 bg-black" />

      {/* ── Expanding thumbnail — grows from the launching card to fill the screen ── */}
      {originRect && expandSrc && (
        <img
          ref={expandRef}
          src={expandSrc}
          alt=""
          aria-hidden
          className="pointer-events-none absolute z-10 object-cover"
          style={{
            top: originRect.top,
            left: originRect.left,
            width: originRect.width,
            height: originRect.height,
          }}
        />
      )}

      {/* ── Player — full screen ── */}
      <div ref={playerRef} className="absolute inset-0 z-20 opacity-0">
        {src ? (
          <iframe
            key={`${server}-${vfSubServer}`}
            src={src}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="h-full w-full"
            style={{ border: "none" }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Tv className="h-8 w-8 text-neutral-600" />
            <p className="font-manrope text-[14px] text-neutral-400">
              Select a server to start watching.
            </p>
          </div>
        )}
      </div>

      {/* Cursor catcher — when the chrome is hidden this layer spans the screen
          to wake it on any cursor movement (the iframe otherwise swallows the
          events); once visible it goes pointer-transparent so the player stays
          interactive. */}
      <div
        className={cn(
          "absolute inset-0 z-[25]",
          controlsVisible ? "pointer-events-none" : "pointer-events-auto",
        )}
        onMouseMove={handleMouseMove}
        onPointerDown={handleMouseMove}
      />

      {/* ── Floating overlay header ── */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-30 transition-opacity duration-500",
          controlsVisible ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Gradient scrim */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)" }}
        />

        <div ref={headerRef} className="pointer-events-auto relative flex items-start justify-between gap-4 px-6 pb-10 pt-5 md:px-10 md:pt-7">
          {/* Title */}
          <div className="min-w-0">
            <h2 className="truncate font-manrope text-[1.25rem] font-semibold leading-tight text-white md:text-[1.6rem]">
              {movie.title}
            </h2>
          </div>

          {/* Controls */}
          <div className="flex shrink-0 items-center gap-2.5">
            <Select value={server} onValueChange={v => setServer(v as ServerId)}>
              <SelectTrigger className={SELECT_TRIGGER}>
                <MonitorPlay className={TRIGGER_ICON} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {SERVERS.map(s => (
                  <SelectItem key={s.id} value={s.id} className={SELECT_ITEM}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {server === "vf" && (
              <Select value={vfSubServer} onValueChange={v => setVfSubServer(v as VfSubServer)}>
                <SelectTrigger className={SELECT_TRIGGER}>
                  <Zap className={TRIGGER_ICON} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT}>
                  {VF_SUB_SERVERS.map(s => (
                    <SelectItem key={s} value={s} className={SELECT_ITEM}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <button onClick={onClose} aria-label="Close" className={ICON_BTN}>
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
