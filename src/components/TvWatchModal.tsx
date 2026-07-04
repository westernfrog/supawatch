"use client";

import { useEffect, useRef, useState } from "react";
import { X, Tv, Layers, ListVideo, MonitorPlay, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";
import { recordTaste, TASTE_WEIGHT } from "@/lib/taste";

interface Season {
  season_number: number;
  episode_count: number;
  name: string;
}

interface Props {
  showId: number;
  showName: string;
  backdropPath: string | null;
  logo: string | null;
  seasons: Season[];
  rating: number;
  year: string | null;
  initialSeason?: number;
  initialEpisode?: number;
  onClose: () => void;
}

const VF_PARAMS =
  "title=false&hideServer=true&autoPlay=true&nextButton=true&autoNext=true&chromecast=false&theme=e50914";
const VF_SUB_SERVERS = [
  "Mega",
  "vEdge",
  "vFast",
  "Beta",
  "Charlie",
  "Cobra",
  "Max",
] as const;
type VfSubServer = (typeof VF_SUB_SERVERS)[number];

const SERVERS = [
  {
    id: "vf",
    name: "Titan",
    domain: "vidfast.pro",
    path: "tv",
    params: VF_PARAMS,
  },
  {
    id: "s1",
    name: "Alpha",
    domain: "vidsrcme.su",
    path: "embed/tv",
    params: "",
  },
  {
    id: "s2",
    name: "Beta",
    domain: "vidsrc-me.ru",
    path: "embed/tv",
    params: "",
  },
  {
    id: "s3",
    name: "Gamma",
    domain: "vidsrc-me.su",
    path: "embed/tv",
    params: "",
  },
] as const;

type ServerId = (typeof SERVERS)[number]["id"];

function getServerSrc(
  server: ServerId,
  showId: number,
  season: number,
  episode: number,
  vfSub: VfSubServer,
): string {
  const s = SERVERS.find((x) => x.id === server);
  if (!s) return "";
  const extra = server === "vf" ? `&server=${vfSub}` : "";
  const query = s.params || extra ? `?${s.params}${extra}` : "";
  return `https://${s.domain}/${s.path}/${showId}/${season}/${episode}${query}`;
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

/* Titan (vidfast) streams live playback state to the parent window — we use it
   so the header reflects what's actually playing (e.g. after auto-next). */
const VIDFAST_ORIGINS = [
  "https://vidfast.pro",
  "https://vidfast.in",
  "https://vidfast.io",
  "https://vidfast.me",
  "https://vidfast.net",
  "https://vidfast.pm",
  "https://vidfast.xyz",
];

export default function TvWatchModal({
  showId,
  showName,
  backdropPath,
  seasons,
  initialSeason,
  initialEpisode,
  onClose,
}: Props) {
  /* Strongest taste signal — the user is pressing play. */
  useEffect(() => {
    recordTaste(
      {
        id: showId,
        media_type: "tv",
        title: showName,
        backdrop_path: backdropPath,
      },
      TASTE_WEIGHT.watch,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  const defaultSeason = seasons.find((s) => s.season_number >= 1) ?? seasons[0];
  const [server, setServer] = useState<ServerId>(SERVERS[0].id);
  const [vfSubServer, setVfSubServer] = useState<VfSubServer>(
    VF_SUB_SERVERS[0],
  );
  const [season, setSeason] = useState(
    initialSeason ?? defaultSeason?.season_number ?? 1,
  );
  const [episode, setEpisode] = useState(initialEpisode ?? 1);
  const [controlsVisible, setControlsVisible] = useState(true);
  // Live season/episode reported by the Titan player (auto-next aware).
  const [vfSeason, setVfSeason] = useState<number | null>(null);
  const [vfEpisode, setVfEpisode] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Titan: trust the player's reported position; others: the app's selection.
  const displaySeason = server === "vf" ? (vfSeason ?? season) : season;
  const displayEpisode = server === "vf" ? (vfEpisode ?? episode) : episode;

  // Episode list reflects the season that's actually showing.
  const currentSeason = seasons.find((s) => s.season_number === displaySeason);
  const episodeCount = currentSeason?.episode_count ?? 1;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (document.fullscreenElement)
        document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  /* Titan streams playback events to the parent window — keep the live
     season/episode so the header tracks auto-next / in-player navigation. */
  useEffect(() => {
    const onMessage = ({ origin, data }: MessageEvent) => {
      if (!VIDFAST_ORIGINS.includes(origin) || !data) return;
      if (data.type !== "PLAYER_EVENT") return;
      const d = data.data;
      if (typeof d?.season === "number") setVfSeason(d.season);
      if (typeof d?.episode === "number") setVfEpisode(d.episode);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Discard any Titan-reported position when the selection changes, so the
  // freshly chosen episode shows until the player reports its own state again.
  const resetVfPosition = () => {
    setVfSeason(null);
    setVfEpisode(null);
  };

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
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const src = getServerSrc(server, showId, season, episode, vfSubServer);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[300] bg-black"
      style={{ animation: "fade-in-up 0.25s ease-out both" }}
      onMouseMove={handleMouseMove}
    >
      {/* ── Iframe — full screen ── */}
      {src ? (
        <iframe
          key={`${server}-${vfSubServer}-${season}-${episode}`}
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
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)",
          }}
        />

        <div className="pointer-events-auto relative flex items-start justify-between gap-4 px-6 pb-10 pt-5 md:px-10 md:pt-7">
          {/* Title + inline episode marker */}
          <div className="min-w-0">
            <h2 className="truncate font-manrope text-[1.25rem] font-semibold leading-tight text-white md:text-[1.6rem]">
              {showName}
              <span className="ml-3 tabular-nums">
                S{displaySeason}:E{displayEpisode}
              </span>
            </h2>
          </div>

          {/* Controls */}
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {/* Season */}
            <Select
              value={String(displaySeason)}
              onValueChange={(v) => {
                setSeason(Number(v));
                setEpisode(1);
                resetVfPosition();
              }}
            >
              <SelectTrigger className={SELECT_TRIGGER}>
                <Layers className={TRIGGER_ICON} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {seasons.map((s) => (
                  <SelectItem
                    key={s.season_number}
                    value={String(s.season_number)}
                    className={SELECT_ITEM}
                  >
                    {s.season_number === 0
                      ? "Specials"
                      : `Season ${s.season_number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Episode */}
            <Select
              value={String(displayEpisode)}
              onValueChange={(v) => {
                setSeason(displaySeason);
                setEpisode(Number(v));
                resetVfPosition();
              }}
            >
              <SelectTrigger className={SELECT_TRIGGER}>
                <ListVideo className={TRIGGER_ICON} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={`${SELECT_CONTENT} max-h-[300px]`}>
                {Array.from({ length: episodeCount }, (_, i) => i + 1).map(
                  (ep) => (
                    <SelectItem
                      key={ep}
                      value={String(ep)}
                      className={SELECT_ITEM}
                    >
                      Episode {ep}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            {/* Server */}
            <Select
              value={server}
              onValueChange={(v) => { setServer(v as ServerId); resetVfPosition(); }}
            >
              <SelectTrigger className={`${SELECT_TRIGGER} ml-1`}>
                <MonitorPlay className={TRIGGER_ICON} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                {SERVERS.map((s) => (
                  <SelectItem key={s.id} value={s.id} className={SELECT_ITEM}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {server === "vf" && (
              <Select
                value={vfSubServer}
                onValueChange={(v) => { setVfSubServer(v as VfSubServer); resetVfPosition(); }}
              >
                <SelectTrigger className={SELECT_TRIGGER}>
                  <Zap className={TRIGGER_ICON} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT}>
                  {VF_SUB_SERVERS.map((s) => (
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
