"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import {
  Power,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Info,
  LayoutGrid,
  RotateCw,
  Tv,
} from "lucide-react";

interface Channel {
  name: string;
  group: string;
  logo: string;
  url: string;
  id: number;
}

interface Region {
  code: string;
  label: string;
  file: string;
  lang: string;
}

const STATIC_NOISE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const DEAD_KEY = "supawatch:dead-channels";

export default function LiveClient({
  regions,
  defaultRegionCode,
  detectedCountry,
}: {
  regions: Region[];
  defaultRegionCode: string;
  detectedCountry: string | null;
}) {
  const [selectedRegion, setSelectedRegion] =
    useState<string>(defaultRegionCode);
  // The file for the active region (falls back to the first region).
  const regionFile =
    regions.find((r) => r.code === selectedRegion)?.file ??
    regions[0]?.file ??
    "";
  // True once the user manually changes region, so the dev IP-refine won't
  // override their choice.
  const userPickedRegion = useRef(false);

  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [tvPower, setTvPower] = useState(true);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [showScanlines, setShowScanlines] = useState(true);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const [osdLines, setOsdLines] = useState<string[]>([]);
  const [clock, setClock] = useState("");
  const typedRef = useRef("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const tvContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tuneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const osdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deadUrls, setDeadUrls] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(DEAD_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const deadRef = useRef<Set<string>>(deadUrls);
  const allChannelsRef = useRef<Channel[]>([]);
  const filteredRef = useRef<Channel[]>([]);
  const currentRef = useRef<Channel | null>(null);
  // Mirror volume/muted into refs so loadStream() always reads fresh values
  // without forcing playChannel to be recreated on every volume change.
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);

  const showOsd = useCallback((lines: string[]) => {
    setOsdLines(lines);
    if (osdTimer.current) clearTimeout(osdTimer.current);
    osdTimer.current = setTimeout(() => setOsdLines([]), 3500);
  }, []);

  const loadStream = useCallback((channel: Channel) => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (tuneTimer.current) clearTimeout(tuneTimer.current);

    const video = videoRef.current;
    if (!video) return;

    video.volume = volumeRef.current;
    video.muted = mutedRef.current;

    let settled = false;
    const ok = () => {
      if (settled) return;
      settled = true;
      if (tuneTimer.current) clearTimeout(tuneTimer.current);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      if (tuneTimer.current) clearTimeout(tuneTimer.current);
      markDeadRef.current(channel);
    };

    tuneTimer.current = setTimeout(fail, 12000);

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      let recoveredMedia = false;
      video.onerror = null;
      hls.loadSource(channel.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.FRAG_BUFFERED, ok);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recoveredMedia) {
          recoveredMedia = true;
          hls.recoverMediaError();
          return;
        }
        fail();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = channel.url;
      video.onloadeddata = ok;
      video.onerror = fail;
      video.play().catch(() => {});
    } else {
      fail();
    }
    // Reads only refs (videoRef, volumeRef, mutedRef, markDeadRef) — stable.
  }, []);

  const playChannel = useCallback(
    (channel: Channel) => {
      if (currentRef.current?.url === channel.url) return;

      setIsSwitching(true);
      setCurrentChannel(channel);

      const chIndex =
        allChannelsRef.current.findIndex((c) => c.id === channel.id) + 1;
      showOsd([
        `CH ${chIndex.toString().padStart(3, "0")}`,
        channel.name,
        channel.group,
      ]);

      if (switchTimer.current) clearTimeout(switchTimer.current);
      switchTimer.current = setTimeout(() => {
        loadStream(channel);
        setIsSwitching(false);
      }, 600);
    },
    [showOsd, loadStream],
  );

  const advancePastDead = useCallback(
    (dead: Channel) => {
      const list = filteredRef.current;
      const i = list.findIndex((c) => c.id === dead.id);
      for (let k = 1; k <= list.length; k++) {
        const cand = list[(Math.max(i, 0) + k) % list.length];
        if (cand && cand.id !== dead.id && !deadRef.current.has(cand.url)) {
          playChannel(cand);
          return;
        }
      }
      setCurrentChannel(null);
      setIsSwitching(false);
    },
    [playChannel],
  );

  // markDead reads only refs + stable callbacks, so it never goes stale.
  const markDead = useCallback(
    (channel: Channel) => {
      if (!deadRef.current.has(channel.url)) {
        setDeadUrls((prev) => {
          const next = new Set(prev).add(channel.url);
          try {
            localStorage.setItem(DEAD_KEY, JSON.stringify([...next]));
          } catch {}
          return next;
        });
      }
      if (currentRef.current?.id === channel.id) advancePastDead(channel);
    },
    [advancePastDead],
  );
  // Keep loadStream's fail() pointing at the latest markDead.
  const markDeadRef = useRef<(c: Channel) => void>(() => {});
  useEffect(() => {
    markDeadRef.current = markDead;
  }, [markDead]);

  useEffect(() => {
    if (!regionFile) return;

    const fetchPlaylist = async () => {
      try {
        const res = await fetch(`/playlists/regions/${regionFile}`);
        const text = await res.text();
        const lines = text.split("\n");

        const parsedChannels: Channel[] = [];
        let tempChannel: Partial<Channel> = {};
        let count = 0;

        for (const line of lines) {
          const tLine = line.trim();
          if (tLine.startsWith("#EXTINF:")) {
            const nameMatch = tLine.match(/,(.+)$/);
            const groupMatch = tLine.match(/group-title="([^"]+)"/);
            const logoMatch = tLine.match(/tvg-logo="([^"]+)"/);
            tempChannel = {
              name: nameMatch ? nameMatch[1].trim() : "Unknown",
              group: groupMatch ? groupMatch[1].trim() : "Undefined",
              logo: logoMatch ? logoMatch[1].trim() : "",
              id: count++,
            };
          } else if (tLine && !tLine.startsWith("#") && tempChannel.name) {
            tempChannel.url = tLine;
            parsedChannels.push(tempChannel as Channel);
            tempChannel = {};
          }
        }

        setAllChannels(parsedChannels);
        allChannelsRef.current = parsedChannels;

        const groups = Array.from(
          new Set(parsedChannels.map((c) => c.group)),
        ).sort();
        setCategories(["All", ...groups]);
        setSelectedCategory("All");

        const firstAlive = parsedChannels.find(
          (c) => !deadRef.current.has(c.url),
        );
        if (firstAlive) playChannel(firstAlive);
        else setCurrentChannel(null);
      } catch (err) {
        console.error("Error fetching playlist:", err);
      }
    };

    fetchPlaylist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionFile]);

  // Local dev: edge headers are absent, so refine the region via the IP-based
  // /api/getRegion endpoint — unless the user has already picked one.
  useEffect(() => {
    if (detectedCountry) return; // server already resolved it
    let cancelled = false;
    fetch("/api/getRegion")
      .then((r) => r.json())
      .then(({ region }: { region?: string }) => {
        if (cancelled || userPickedRegion.current || !region) return;
        const next = regions.some((r) => r.code === region) ? region : "global";
        setSelectedRegion(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [detectedCountry, regions]);

  const aliveChannels = useMemo(() => {
    return allChannels.filter((c) => !deadUrls.has(c.url));
  }, [allChannels, deadUrls]);

  const filteredChannels = useMemo(() => {
    return aliveChannels.filter((c) => {
      return selectedCategory === "All" || c.group === selectedCategory;
    });
  }, [aliveChannels, selectedCategory]);

  // id → 1-based position in the full playlist, for the on-screen channel number.
  const channelNumber = useMemo(() => {
    const m = new Map<number, number>();
    allChannels.forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, [allChannels]);

  useEffect(() => {
    deadRef.current = deadUrls;
  }, [deadUrls]);
  useEffect(() => {
    filteredRef.current = filteredChannels;
  }, [filteredChannels]);
  useEffect(() => {
    currentRef.current = currentChannel;
  }, [currentChannel]);

  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  /* Live clock for the on-screen channel bug. */
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(
    () => () => {
      hlsRef.current?.destroy();
      if (tuneTimer.current) clearTimeout(tuneTimer.current);
      if (switchTimer.current) clearTimeout(switchTimer.current);
      if (osdTimer.current) clearTimeout(osdTimer.current);
      if (typeTimer.current) clearTimeout(typeTimer.current);
    },
    [],
  );

  const changeChannelRelative = useCallback(
    (dir: number) => {
      if (!tvPowerRef.current) return;
      const list = filteredRef.current;
      if (!list.length) return;
      const idx = list.findIndex((c) => c.id === currentRef.current?.id);
      const next = idx === -1 ? 0 : (idx + dir + list.length) % list.length;
      playChannel(list[next]);
    },
    [playChannel],
  );

  const tvPowerRef = useRef(true);
  useEffect(() => {
    tvPowerRef.current = tvPower;
  }, [tvPower]);

  const togglePower = useCallback(() => {
    setTvPower((p) => {
      const next = !p;
      if (!next) {
        if (hlsRef.current) hlsRef.current.destroy();
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute("src");
          videoRef.current.load();
        }
        setOsdLines([]);
        setIsCategoryMenuOpen(false);
      } else {
        const resume = currentRef.current ?? filteredRef.current[0];
        if (resume) {
          // currentRef still holds the channel; force a reload past the dedupe.
          setIsSwitching(true);
          setCurrentChannel(resume);
          if (switchTimer.current) clearTimeout(switchTimer.current);
          switchTimer.current = setTimeout(() => {
            loadStream(resume);
            setIsSwitching(false);
          }, 600);
        }
      }
      return next;
    });
  }, [loadStream]);

  const changeVolume = useCallback(
    (delta: number) => {
      if (!tvPowerRef.current) return;
      let newVol = Math.round(volumeRef.current * 100) + delta;
      newVol = Math.max(0, Math.min(100, newVol));
      setVolume(newVol / 100);
      setMuted(newVol === 0);
      const bars = Math.round(newVol / 10);
      showOsd([
        "VOL " + "█".repeat(bars) + "░".repeat(10 - bars),
        newVol === 0 ? "MUTED" : `${newVol}%`,
      ]);
    },
    [showOsd],
  );

  const toggleMute = useCallback(() => {
    if (!tvPowerRef.current) return;
    setMuted((m) => {
      const next = !m;
      showOsd([next ? "MUTED" : `VOL ${Math.round(volumeRef.current * 100)}%`]);
      return next;
    });
  }, [showOsd]);

  const showCurrentInfo = useCallback(() => {
    if (!tvPowerRef.current || !currentRef.current) return;
    const ch = currentRef.current;
    const chIndex = allChannelsRef.current.findIndex((c) => c.id === ch.id) + 1;
    showOsd([
      `CH ${chIndex.toString().padStart(3, "0")}`,
      ch.name,
      ch.group,
      `VOL ${Math.round(volumeRef.current * 100)}%`,
    ]);
  }, [showOsd]);

  const toggleCategoryMenu = useCallback(() => {
    if (!tvPowerRef.current) return;
    setIsCategoryMenuOpen((prev) => !prev);
  }, []);

  const playFirstOfCategory = useCallback(
    (cat: string) => {
      const first = allChannelsRef.current.find(
        (c) => c.group === cat || cat === "All",
      );
      if (first) playChannel(first);
    },
    [playChannel],
  );

  const selectCategoryFromMenu = (cat: string) => {
    if (!tvPower) return;
    setSelectedCategory(cat);
    setIsCategoryMenuOpen(false);
    showOsd(["CATEGORY", cat]);
    playFirstOfCategory(cat);
  };

  const submitTypedNumber = useCallback(
    (numStr: string) => {
      if (typeTimer.current) clearTimeout(typeTimer.current);
      typedRef.current = "";
      const num = parseInt(numStr, 10);
      if (isNaN(num)) return;

      const targetChannel = allChannelsRef.current[num - 1];
      if (targetChannel) {
        setSelectedCategory("All");
        playChannel(targetChannel);
      } else {
        showOsd([`CH ${numStr}`, "INVALID"]);
      }
    },
    [playChannel, showOsd],
  );

  const handleNumpad = useCallback(
    (key: string) => {
      if (!tvPowerRef.current) return;

      if (key === "clear") {
        typedRef.current = "";
        showOsd(["———"]);
        return;
      }
      if (key === "enter") {
        submitTypedNumber(typedRef.current);
        return;
      }

      const newNum = typedRef.current + key;
      if (newNum.length > 4) return;
      typedRef.current = newNum;
      showOsd([`CH ${newNum}_`]);
      if (typeTimer.current) clearTimeout(typeTimer.current);
      typeTimer.current = setTimeout(() => submitTypedNumber(newNum), 2000);
    },
    [showOsd, submitTypedNumber],
  );

  const goFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      tvContainerRef.current?.requestFullscreen?.();
    }
  }, []);

  const toggleScanlines = useCallback(() => {
    setShowScanlines((prev) => {
      showOsd([`SCANLINES ${!prev ? "ON" : "OFF"}`]);
      return !prev;
    });
  }, [showOsd]);

  const reloadCurrent = useCallback(() => {
    const ch = currentRef.current;
    if (!ch || !tvPowerRef.current) return;
    showOsd(["RELOADING"]);
    setIsSwitching(true);
    setCurrentChannel(ch);
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => {
      loadStream(ch);
      setIsSwitching(false);
    }, 600);
  }, [loadStream, showOsd]);

  /* ── Keyboard remote ── one listener, always reads the latest handlers. */
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  // Refresh the handler after every render so it closes over current callbacks,
  // without re-subscribing the window listener (assigned outside render).
  useEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Let a focused button handle its own Enter/Space activation natively.
      if (el?.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        handleNumpad(e.key);
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          changeChannelRelative(1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeChannelRelative(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          changeVolume(10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          changeVolume(-10);
          break;
        case "Enter":
          handleNumpad("enter");
          break;
        case "Backspace":
          e.preventDefault();
          handleNumpad("clear");
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "f":
        case "F":
          goFullscreen();
          break;
        case "i":
        case "I":
          showCurrentInfo();
          break;
        case "g":
        case "G":
          toggleCategoryMenu();
          break;
        case "p":
        case "P":
          togglePower();
          break;
        case "Escape":
          setIsCategoryMenuOpen(false);
          break;
      }
    };
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#030303] font-manrope text-white">
      {/* Ambient room glow — reacts to TV power state */}
      <div
        aria-hidden
        className={cn("pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000", tvPower ? "opacity-100" : "opacity-0")}
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(74,222,128,0.04), rgba(30,60,200,0.02) 40%, transparent 70%)" }}
      />
      {/* Subtle grid texture on background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-col items-center gap-6 px-4 pb-12 pt-28 md:h-[calc(100vh-80px)] md:flex-row md:items-stretch md:gap-8 md:px-8 md:pb-6 md:pt-8 lg:gap-10 lg:px-12">
        {/* ════════════════ TELEVISION ════════════════ */}
        <div ref={tvContainerRef} className="relative flex h-full w-full shrink-0 flex-col justify-center md:flex-1">
          {/* Ambient screen glow behind the TV */}
          {tvPower && (
            <div aria-hidden className="screen-glow pointer-events-none absolute -inset-8 z-0 rounded-[3rem] blur-3xl" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(74,222,128,0.08), rgba(60,120,255,0.04) 50%, transparent 75%)" }} />
          )}

          {/* TV Frame — sleek modern monitor */}
          <div className="relative z-10 overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)]">
            {/* Screen bezel */}
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              <div className={cn("relative h-full w-full origin-center overflow-hidden", tvPower ? "crt-on" : "crt-off")}>
                <video ref={videoRef} className={cn("h-full w-full bg-black object-contain", tvPower && "crt-flicker")} playsInline controls={false} />

                {showScanlines && tvPower && (
                  <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.015),rgba(0,0,255,0.04))] bg-[length:100%_2px,3px_100%] opacity-20 mix-blend-multiply" />
                )}
                <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.7)]" />
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.06]" />

                {tvPower && (
                  <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                    <div className="crt-hum absolute inset-x-0 h-[16%] bg-gradient-to-b from-transparent via-white/[0.05] to-transparent" />
                  </div>
                )}

                {isSwitching && tvPower && (
                  <>
                    <div className="tv-static-anim absolute inset-0 z-20 opacity-35 mix-blend-screen" style={{ backgroundImage: STATIC_NOISE }} />
                    <div className="sync-sweep pointer-events-none absolute inset-x-0 z-20 h-[18%] bg-gradient-to-b from-transparent via-white/20 to-transparent blur-[1px]" />
                  </>
                )}

                {isCategoryMenuOpen && tvPower && (
                  <div className="absolute inset-0 z-30 flex flex-col bg-[#03022b]/95 p-3 font-mono text-white backdrop-blur-sm">
                    <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#1b1b8a] to-[#0a0a5c] px-4 py-2.5 rounded-lg">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300 lg:text-sm">◆ Program Guide</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 lg:text-[11px]">G / Esc to exit</div>
                    </div>
                    <div className="mt-2 flex-1 overflow-y-auto rounded-lg border border-white/5 bg-[#02021c] p-2">
                      <div className="flex flex-col gap-0.5">
                        {categories.map((cat, index) => (
                          <button key={cat} onClick={() => selectCategoryFromMenu(cat)} className={cn("flex items-center gap-2 rounded px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider transition-all lg:text-sm", selectedCategory === cat ? "bg-amber-400 text-black" : "text-cyan-100/80 hover:bg-white/10")}>
                            <span className={cn("w-7 shrink-0 tabular-nums", selectedCategory === cat ? "opacity-100" : "opacity-40")}>{(index + 1).toString().padStart(2, "0")}</span>
                            <span className="flex-1 truncate">{cat}</span>
                            {selectedCategory === cat && <span className="text-xs">◀</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tvPower && currentChannel && !isSwitching && (
                  <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-md bg-black/50 px-2.5 py-1 backdrop-blur-md sm:left-4 sm:top-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff2d2d] shadow-[0_0_6px_#ff2d2d] led-breathe" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white/80">Live</span>
                  </div>
                )}

                {tvPower && clock && (
                  <div className="absolute right-3 top-3 z-20 rounded-md bg-black/50 px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest text-[#7dffb0]/90 backdrop-blur-md sm:right-4 sm:top-4 lg:text-xs">{clock}</div>
                )}

                {tvPower && osdLines.length > 0 && (
                  <div className="osd-in absolute bottom-4 left-4 z-30 max-w-[80%] rounded-r-md border-l-[3px] border-[#4ade80] bg-black/60 py-2 pl-3 pr-5 backdrop-blur-md sm:bottom-5 sm:left-5">
                    {osdLines.map((line, i) => (
                      <div key={i} className={cn("font-mono uppercase leading-tight tracking-widest text-[#7dffb0] drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]", i === 0 ? "text-base font-black sm:text-xl lg:text-2xl" : "text-[10px] font-bold sm:text-xs")}>{line}</div>
                    ))}
                  </div>
                )}

                {isSwitching && tvPower && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <span className="osd-blink font-mono text-sm font-black uppercase tracking-[0.4em] text-white/70 sm:text-lg">Tuning</span>
                  </div>
                )}

                {tvPower && !currentChannel && !isSwitching && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
                    <Tv className="h-7 w-7 text-neutral-700" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-600">No signal — please stand by</p>
                  </div>
                )}
              </div>

              {!tvPower && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ff2d2d] shadow-[0_0_12px_4px_rgba(255,45,45,0.5)] led-breathe" />
                </div>
              )}
            </div>

            {/* Thin bottom bar — modern monitor chin */}
            <div className="flex items-center justify-between border-t border-white/[0.04] bg-[#080808] px-4 py-2.5 sm:px-6 sm:py-3">
              <div className="flex items-center gap-3">
                <div className="font-nichrome text-sm font-black uppercase text-neutral-500 lg:text-base tracking-tight">SUPA<span className="text-[#e50914]">WATCH</span></div>
                <div className="hidden h-4 w-px bg-white/10 sm:block" />
                <div className="hidden gap-1 opacity-60 sm:flex">{[1,2,3,4,5,6].map(i => <div key={i} className="h-3 w-[2px] rounded-full bg-neutral-700" />)}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn("h-2 w-2 rounded-full transition-colors", tvPower ? "bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-[#cc0000] shadow-[0_0_6px_rgba(204,0,0,0.5)]")} />
                <div className="hidden items-center gap-2 sm:flex">
                  <button onClick={() => changeChannelRelative(1)} className="remote-btn flex h-7 items-center justify-center rounded px-3 text-[8px] font-black uppercase tracking-wider text-neutral-400">CH+</button>
                  <button onClick={() => changeVolume(10)} className="remote-btn flex h-7 items-center justify-center rounded px-3 text-[8px] font-black uppercase tracking-wider text-neutral-400">VOL+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ REMOTE ════════════════ */}
        <div className="remote-body relative mx-auto flex w-full max-w-[200px] shrink-0 flex-col items-center gap-5 rounded-[2.2rem] border border-white/[0.04] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] md:w-[210px] md:max-w-[210px] md:p-6">
          {/* IR blaster window */}
          <div className="absolute left-1/2 top-0 h-2 w-14 -translate-x-1/2 rounded-b-lg bg-[#1a0015] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <div className="mx-auto mt-0.5 h-1 w-8 rounded-full bg-[#220020] opacity-60" />
          </div>

          {/* Top row: power + model */}
          <div className="flex w-full items-center justify-between pt-1">
            <button onClick={togglePower} aria-label="Power" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#d42020] to-[#8b0000] shadow-[0_3px_8px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
              <Power className="h-4 w-4 text-white/90" />
            </button>
            <div className="text-[8px] font-bold tracking-[0.2em] text-neutral-600">RM—X900</div>
          </div>

          {/* Function buttons */}
          <div className="grid w-full grid-cols-2 gap-2">
            <button onClick={toggleCategoryMenu} className="remote-btn col-span-2 flex h-8 items-center justify-center gap-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-neutral-400">
              <LayoutGrid className="h-3 w-3" /> Guide
            </button>
            <button onClick={() => { if(!tvPower) return; showOsd(["SIGNAL FLUSH"]); setIsSwitching(true); setTimeout(() => setIsSwitching(false), 500); }} className="remote-btn flex h-7 items-center justify-center rounded-lg text-[8px] font-bold uppercase text-red-400/80">Flush</button>
            <button onClick={reloadCurrent} className="remote-btn flex h-7 items-center justify-center rounded-lg text-[8px] font-bold uppercase text-emerald-400/80"><RotateCw className="mr-1 h-2.5 w-2.5" />Reload</button>
            <button onClick={toggleScanlines} className="remote-btn flex h-7 items-center justify-center rounded-lg text-[8px] font-bold uppercase text-amber-400/80">Scan</button>
            <button onClick={goFullscreen} className="remote-btn flex h-7 items-center justify-center rounded-lg text-[8px] font-bold uppercase text-sky-400/80">Full</button>
          </div>

          {/* D-Pad */}
          <div className="relative flex h-[120px] w-[120px] items-center justify-center rounded-full dpad-ring">
            <div className="flex h-[90px] w-[90px] flex-col items-center justify-between rounded-full bg-[#111] p-0.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] border border-black/50">
              <button onClick={() => changeChannelRelative(1)} className="flex h-6 w-full items-center justify-center rounded-t-full hover:bg-white/5 active:bg-white/10"><ChevronUp className="h-4 w-4 text-neutral-400" /></button>
              <div className="flex w-full items-center justify-between">
                <button onClick={() => changeVolume(-10)} className="flex h-7 w-6 items-center justify-center rounded-l-full hover:bg-white/5 active:bg-white/10"><Minus className="h-3 w-3 text-neutral-400" /></button>
                <button onClick={toggleMute} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0a] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] active:bg-black">
                  {muted || volume === 0 ? <VolumeX className="h-3.5 w-3.5 text-red-500/80" /> : <Volume2 className="h-3.5 w-3.5 text-neutral-500" />}
                </button>
                <button onClick={() => changeVolume(10)} className="flex h-7 w-6 items-center justify-center rounded-r-full hover:bg-white/5 active:bg-white/10"><Plus className="h-3 w-3 text-neutral-400" /></button>
              </div>
              <button onClick={() => changeChannelRelative(-1)} className="flex h-6 w-full items-center justify-center rounded-b-full hover:bg-white/5 active:bg-white/10"><ChevronDown className="h-4 w-4 text-neutral-400" /></button>
            </div>
            {/* Labels */}
            <span className="absolute top-1 text-[7px] font-bold text-neutral-600">CH▲</span>
            <span className="absolute bottom-1 text-[7px] font-bold text-neutral-600">CH▼</span>
            <span className="absolute left-0.5 text-[7px] font-bold text-neutral-600">−</span>
            <span className="absolute right-0.5 text-[7px] font-bold text-neutral-600">+</span>
          </div>

          {/* Info button */}
          <button onClick={showCurrentInfo} className="remote-btn flex h-7 w-full items-center justify-center gap-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider text-neutral-500"><Info className="h-3 w-3" /> Info</button>

          {/* Numpad */}
          <div className="grid w-full grid-cols-3 gap-1.5">
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} onClick={() => handleNumpad(n.toString())} className="remote-btn flex h-8 items-center justify-center rounded-lg font-mono text-sm font-bold text-neutral-400">{n}</button>
            ))}
            <button onClick={() => handleNumpad("clear")} className="remote-btn flex h-8 items-center justify-center rounded-lg text-[9px] font-black text-red-400/70">DEL</button>
            <button onClick={() => handleNumpad("0")} className="remote-btn flex h-8 items-center justify-center rounded-lg font-mono text-sm font-bold text-neutral-400">0</button>
            <button onClick={() => handleNumpad("enter")} className="remote-btn flex h-8 items-center justify-center rounded-lg text-[9px] font-black text-emerald-400/70">ENT</button>
          </div>

          {/* Bottom brand mark */}
          <div className="mt-auto flex w-full items-center justify-center pt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.06]" />
            <span className="px-3 font-nichrome text-[8px] font-bold uppercase text-neutral-700 tracking-tight">Supawatch</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.06]" />
          </div>
        </div>
      </div>

      {/* ════════════════ CHANNEL GUIDE ════════════════ */}
      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-24 sm:px-8 lg:px-12">
        {/* Keyboard shortcut hint */}
        <div className="mb-8 flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-mono text-[10px] font-medium leading-relaxed tracking-wider text-neutral-500 backdrop-blur-sm sm:text-[11px]">
          <span className="hidden text-neutral-600 sm:inline">⌨</span>
          ↑↓ channel · ←→ volume · 0–9 jump · M mute · F fullscreen · G guide · Some channels may be geo-restricted.
        </div>

        <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end">
          <div className="flex items-baseline gap-4">
            <h2 className="font-nichrome text-2xl font-black uppercase leading-none text-white lg:text-3xl tracking-tight">Channel Guide</h2>
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-600">{aliveChannels.length} CH</span>
          </div>
          {regions.length > 1 && (
            <label className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-600">Region</span>
              <select value={selectedRegion} onChange={(e) => { userPickedRegion.current = true; setSelectedRegion(e.target.value); }} className="cursor-pointer appearance-none rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] font-bold uppercase text-neutral-300 outline-none transition-colors hover:bg-white/[0.08] focus:border-white/20">
                {regions.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {aliveChannels.map((channel, idx) => {
            const num = channelNumber.get(channel.id) ?? 0;
            const isActive = currentChannel?.url === channel.url;
            return (
              <button key={channel.id} onClick={() => { if (!tvPower) setTvPower(true); playChannel(channel); if (typeof window !== "undefined" && window.innerWidth < 1024) tvContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className={cn("card-in group flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400",
                  isActive ? "border-[#4ade80]/30 bg-[#4ade80]/10 shadow-[0_0_20px_rgba(74,222,128,0.1)]" : "border-white/[0.04] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.05]"
                )} style={{ animationDelay: `${Math.min(idx * 20, 400)}ms` }}>
                <div className={cn("flex h-8 w-9 shrink-0 items-center justify-center rounded font-mono text-[12px] font-bold tabular-nums", isActive ? "bg-[#4ade80]/20 text-[#4ade80]" : "text-neutral-600 group-hover:text-[#4ade80]/70")}>
                  {num.toString().padStart(3, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-mono text-[11px] font-bold uppercase tracking-wide lg:text-[12px]", isActive ? "text-[#4ade80]" : "text-neutral-200")}>{channel.name}</p>
                  <p className={cn("truncate text-[9px] font-bold uppercase tracking-widest", isActive ? "text-[#4ade80]/50" : "text-neutral-600")}>{channel.group}</p>
                </div>
                {isActive && (
                  <span className="flex shrink-0 items-end gap-[2px] pr-1" aria-hidden>
                    {[0,1,2].map(i => <span key={i} className="w-[2px] rounded-full bg-[#4ade80]" style={{ height: 10, transformOrigin: "bottom", animation: `eq 0.9s ease-in-out ${i * 0.15}s infinite` }} />)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {filteredChannels.length === 0 && (
          <p className="py-12 text-center font-mono text-sm uppercase tracking-widest text-neutral-600">No channels available in this category.</p>
        )}
      </div>
    </div>
  );
}

