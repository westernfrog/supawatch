"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from "react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import { parseId3, type Id3Text } from "@/lib/id3";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeftRight,
  Crop,
  PictureInPicture2,
  Star,
  Music,
  Search,
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
const CRT_KEY = "supawatch:crt";
const CRT_EVENT = "supawatch:crt-change";
/* The keys the handset itself carries — what blinks the emitter. Single
   characters are matched lower-cased, so both cases of each shortcut count. */
const REMOTE_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Enter",
  "Backspace",
  "m",
  "l",
  "z",
  "f",
  "i",
  "g",
  "p",
]);

const FAV_KEY = "supawatch:favourites";
const LAST_KEY = "supawatch:last-channel";

const FAV_EVENT = "supawatch:favourites-change";

/* Favourites are stored state too, so they go through useSyncExternalStore for
   the same reason the CRT setting does: the server has none and the client may
   have several, and anything that renders differently between the two — here
   the filter chip, which only appears once you have favourites — is a hydration
   mismatch. React discards the whole tree when that happens.

   Channels are keyed by stream URL rather than id: the id is only a position in
   whichever playlist is loaded, so it shifts when the region changes or a feed
   is re-cut. The URL is the one stable handle. */
const NO_FAVOURITES: ReadonlySet<string> = new Set();
let favRaw: string | null = null;
let favSet: ReadonlySet<string> = NO_FAVOURITES;

function subscribeFavourites(onChange: () => void) {
  window.addEventListener(FAV_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FAV_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/* getSnapshot has to return a stable reference or React re-renders forever, so
   the parsed set is cached and only rebuilt when the stored string changes. */
function readFavourites(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (raw !== favRaw) {
      favRaw = raw;
      favSet = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    }
    return favSet;
  } catch {
    return NO_FAVOURITES;
  }
}

function serverFavourites(): ReadonlySet<string> {
  return NO_FAVOURITES;
}

/* The CRT setting lives in localStorage — external state, read through
   useSyncExternalStore. The toggle writes and then fires CRT_EVENT, which is
   what wakes every subscriber up; storage events alone would not, since they
   only fire in *other* tabs. */
function subscribeCrt(onChange: () => void) {
  window.addEventListener(CRT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CRT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readCrt() {
  try {
    return localStorage.getItem(CRT_KEY) !== "off";
  } catch {
    return true;
  }
}

export default function LiveClient({
  regions,
  defaultRegionCode,
  detectedCountry,
  initialChannel = null,
}: {
  regions: Region[];
  defaultRegionCode: string;
  detectedCountry: string | null;
  initialChannel?: number | null;
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
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const favourites = useSyncExternalStore(
    subscribeFavourites,
    readFavourites,
    serverFavourites,
  );
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  /* Track and artist from the stream's own ID3 tags, when it sends any. */
  const [nowPlayingTrack, setNowPlayingTrack] = useState<Id3Text | null>(null);
  /* The tube treatment, remembered between visits. localStorage is external,
     server-less state, so it is read through useSyncExternalStore: the server
     snapshot is "on", the client snapshot is whatever is stored, and React
     reconciles the two after hydration on its own. Reading it in a plain
     initializer would leave a hydration mismatch (React keeps the server
     markup, so the stored setting silently never applies); reading it in an
     effect means calling setState from an effect, which cascades a render. */
  const crtOn = useSyncExternalStore(subscribeCrt, readCrt, () => true);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  // Picture size: fit the whole frame (letterboxed) or fill it (cropped).
  const [fillScreen, setFillScreen] = useState(false);

  /* The emitter behind the window at the tip. A real handset gives you exactly
     one piece of feedback that it fired — the LED blinks — and it blinks per
     press, so a held key strobes rather than staying lit. The timer is reset
     rather than left to run so a fast run of presses reads as separate blinks
     instead of one long glow. */
  const [irFiring, setIrFiring] = useState(false);
  const irTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseIr = useCallback(() => {
    if (irTimerRef.current) clearTimeout(irTimerRef.current);
    setIrFiring(true);
    irTimerRef.current = setTimeout(() => setIrFiring(false), 130);
  }, []);
  useEffect(
    () => () => {
      if (irTimerRef.current) clearTimeout(irTimerRef.current);
    },
    [],
  );

  const [osdLines, setOsdLines] = useState<string[]>([]);
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
  // The channel we were on before this one — what Prev CH zaps back to.
  const prevChannelRef = useRef<Channel | null>(null);
  /* The channel from ?ch=, held until the playlist that gives it meaning has
     loaded, then consumed once so a later region change doesn't re-apply it. */
  const pendingChannelRef = useRef<number | null>(initialChannel);
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
      /* Timed metadata: music and radio feeds tag each fragment with the track
         on air. Most channels send nothing, so this simply stays quiet. */
      hls.on(Hls.Events.FRAG_PARSING_METADATA, (_evt, data) => {
        for (const sample of data.samples ?? []) {
          const parsed = parseId3(sample.data);
          if (parsed) {
            setNowPlayingTrack(parsed);
            break;
          }
        }
      });
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

      // Remember what we are leaving, so Prev CH can zap back to it.
      if (currentRef.current) prevChannelRef.current = currentRef.current;
      // Last channel's track must not linger over the new one.
      setNowPlayingTrack(null);

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
      /* A channel that failed to tune was never really watched, so skipping off
         it must not become what Prev CH goes back to — otherwise the key lands
         you on a channel you know is dead. Keep the one before it instead. */
      const beforeDead = prevChannelRef.current;
      for (let k = 1; k <= list.length; k++) {
        const cand = list[(Math.max(i, 0) + k) % list.length];
        if (cand && cand.id !== dead.id && !deadRef.current.has(cand.url)) {
          playChannel(cand);
          prevChannelRef.current = beforeDead;
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
  const toggleFavourite = useCallback((url: string) => {
    const next = new Set(readFavourites());
    if (!next.delete(url)) next.add(url);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
    } catch {}
    window.dispatchEvent(new Event(FAV_EVENT));
  }, []);

  const toggleCrt = useCallback(() => {
    try {
      localStorage.setItem(CRT_KEY, readCrt() ? "off" : "on");
    } catch {}
    window.dispatchEvent(new Event(CRT_EVENT));
  }, []);

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

        /* What to tune, in order of how deliberate it is: a channel someone
           put in the link, then whatever they were last watching, then the
           first one that works. A shared link should win over local history —
           it is the more specific intent, and the whole point of sending it. */
        const wanted = pendingChannelRef.current;
        pendingChannelRef.current = null;
        const fromLink =
          wanted != null ? parsedChannels[wanted - 1] : undefined;

        let resumed: Channel | undefined;
        if (!fromLink) {
          try {
            const lastUrl = localStorage.getItem(LAST_KEY);
            if (lastUrl) {
              resumed = parsedChannels.find(
                (c) => c.url === lastUrl && !deadRef.current.has(c.url),
              );
            }
          } catch {}
        }

        const firstAlive = parsedChannels.find(
          (c) => !deadRef.current.has(c.url),
        );
        const target = fromLink ?? resumed ?? firstAlive;
        if (target) playChannel(target);
        else setCurrentChannel(null);
      } catch (err) {
        console.error("Error fetching playlist:", err);
      }
    };

    fetchPlaylist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionFile]);

  /* Edge headers are absent locally (and on any host that doesn't set them), so
     refine the region over IP — unless the user has already picked one.
     `detected` matters: the endpoint answers "US" when it has no idea, and
     acting on that would drop someone in an unsupported country onto the
     American feed instead of the global one the server already chose. */
  useEffect(() => {
    if (detectedCountry) return; // server already resolved it
    let cancelled = false;
    fetch("/api/getRegion")
      .then((r) => r.json())
      .then(({ region, detected }: { region?: string; detected?: boolean }) => {
        if (cancelled || userPickedRegion.current || !detected || !region) {
          return;
        }
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

  /* Channels that failed to tune are remembered so we stop offering them —
     but the mark is permanent, and one bad network can hide the whole
     playlist. Always leave a way back. */
  const hiddenCount = allChannels.length - aliveChannels.length;

  const resetDeadChannels = useCallback(() => {
    setDeadUrls(new Set());
    deadRef.current = new Set();
    try {
      localStorage.removeItem(DEAD_KEY);
    } catch {}
    showOsd(["Channel list", "Restored"]);
    const first = allChannelsRef.current[0];
    if (first && !currentRef.current) playChannel(first);
  }, [playChannel, showOsd]);

  /* Favourites narrow the set the remote walks too, not just the guide — with
     the filter on, ch+/ch- should step through your channels, which is the
     whole reason for keeping a list. */
  /* Unstarring the last favourite while the filter is on would otherwise leave
     an empty guide and no chip left to switch it off with. */
  const favouriteFilterOn = favouritesOnly && favourites.size > 0;

  const filteredChannels = useMemo(() => {
    return aliveChannels.filter(
      (c) =>
        (selectedCategory === "All" || c.group === selectedCategory) &&
        (!favouriteFilterOn || favourites.has(c.url)),
    );
  }, [aliveChannels, selectedCategory, favouriteFilterOn, favourites]);

  /* The guide narrows by name as well as category; the remote's ch+/ch- still
     walks `filteredChannels` so typing in the guide never hijacks the set. */
  const guideChannels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredChannels;
    return filteredChannels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
    );
  }, [filteredChannels, query]);

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

  /* Remember the channel, and keep the address bar pointing at it so the page
     can simply be copied and sent. replaceState rather than push: zapping is
     not navigation, and forty channel changes should not mean forty presses of
     the back button to leave. */
  useEffect(() => {
    if (!currentChannel) return;
    try {
      localStorage.setItem(LAST_KEY, currentChannel.url);
    } catch {}

    const number = allChannelsRef.current.findIndex(
      (c) => c.url === currentChannel.url,
    );
    if (number < 0) return;
    const url = new URL(window.location.href);
    url.searchParams.set("ch", String(number + 1));
    url.searchParams.set("region", selectedRegion);
    window.history.replaceState(null, "", url);
  }, [currentChannel, selectedRegion]);

  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

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

  /* The two on-screen menus are mutually exclusive — opening one closes the
     other, so the remote can never leave both stacked on the tube. */
  const toggleCategoryMenu = useCallback(() => {
    if (!tvPowerRef.current) return;
    setIsCategoryMenuOpen((prev) => {
      if (!prev) setIsRegionMenuOpen(false);
      return !prev;
    });
  }, []);

  const toggleRegionMenu = useCallback(() => {
    if (!tvPowerRef.current) return;
    setIsRegionMenuOpen((prev) => {
      if (!prev) setIsCategoryMenuOpen(false);
      return !prev;
    });
  }, []);

  const selectRegionFromMenu = useCallback(
    (code: string, label: string) => {
      userPickedRegion.current = true;
      setSelectedRegion(code);
      setIsRegionMenuOpen(false);
      showOsd(["REGION", label]);
    },
    [showOsd],
  );

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

  /* Prev CH — zap back to the channel before this one. playChannel records the
     outgoing channel, so pressing it twice returns you where you started. */
  const jumpToPreviousChannel = useCallback(() => {
    if (!tvPowerRef.current) return;
    const prev = prevChannelRef.current;
    if (!prev) {
      showOsd(["No previous", "Channel"]);
      return;
    }
    playChannel(prev);
  }, [playChannel, showOsd]);

  /* Picture size — plenty of these feeds are 4:3 or pillarboxed inside a 16:9
     frame, so "fill" crops to the screen the way a TV's zoom does. */
  const cyclePictureSize = useCallback(() => {
    if (!tvPowerRef.current) return;
    setFillScreen((fill) => !fill);
  }, []);

  useEffect(() => {
    if (!currentRef.current) return;
    showOsd(["Picture", fillScreen ? "Fill" : "Fit"]);
    // Announce only on change, not on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillScreen]);

  /* Picture-in-picture — browser-native, so the stream keeps running in a
     floating window. Not every browser or stream allows it; say so rather than
     failing silently. */
  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !tvPowerRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        showOsd(["Picture in", "Picture"]);
      } else {
        showOsd(["PIP", "Unavailable"]);
      }
    } catch {
      showOsd(["PIP", "Unavailable"]);
    }
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

      /* The keyboard is a remote too, so it blinks the emitter — but only for
         keys the handset actually acts on, otherwise typing anywhere on the
         page would set it flashing. Escape is excluded: it dismisses menus,
         which is not a key the handset carries. */
      if (
        (e.key >= "0" && e.key <= "9") ||
        REMOTE_KEYS.has(e.key.length === 1 ? e.key.toLowerCase() : e.key)
      ) {
        pulseIr();
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
        case "l":
        case "L":
          jumpToPreviousChannel();
          break;
        case "z":
        case "Z":
          cyclePictureSize();
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
          setIsRegionMenuOpen(false);
          break;
      }
    };
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* Remote materials. The page is near-black, so a mid-grey handset reads as a
     pale slab pasted onto it. A real one is dark graphite: the body nearly as
     black as the page, and the keys a shade above it, separated by their own
     shadow and a hairline of light along the moulded top edge rather than by
     being painted lighter. Legends carry the contrast instead of the plastic.
     KEY_PRESS is separate so the coloured keys can travel on press without
     inheriting the graphite fill. */
  /* A key is a domed cap sitting proud of a well cut into the shell, so it
     carries four things at once: light caught along its moulded top edge, the
     shading of the dome falling off toward the bottom lip, its own drop shadow
     onto the shell, and the dark line of the well around it. */
  const KEY_SHADOW =
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.17),inset_0_-2px_3px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.7),0_3px_6px_-1px_rgba(0,0,0,0.85)]";
  const KEY = cn(
    "bg-gradient-to-b from-[#3c3c45] via-[#2a2a31] to-[#1b1b20] ring-1 ring-black/75 hover:from-[#484852] hover:via-[#33333b] hover:to-[#232329]",
    KEY_SHADOW,
  );
  const KEY_PRESS =
    "transition-all duration-75 active:translate-y-[1.5px] active:brightness-[0.82] active:shadow-[inset_0_2px_5px_rgba(0,0,0,0.85),0_1px_1px_rgba(0,0,0,0.6)]";
  /* Two-way keys are one moulded piece, so the rocker is a single shell with a
     seam across it rather than two separate keys. */
  const ROCKER = cn(
    "overflow-hidden rounded-full bg-gradient-to-b from-[#3c3c45] via-[#2a2a31] to-[#1b1b20] ring-1 ring-black/75",
    KEY_SHADOW,
  );
  /* Legends are printed on the shell, not the keys — dim, low contrast. */
  const ENGRAVED =
    "font-manrope text-[9px] font-semibold uppercase tracking-[0.18em] text-[#5d5d66]";
  /* Every key glyph sits at one brightness so the field reads as one moulded
     set; hover lifts the individual key rather than recolouring it. */
  const GLYPH = "text-[#c6c6d0] transition-colors group-hover:text-white";

  const LABEL =
    "font-manrope text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600";

  return (
    <div className="min-h-screen w-full bg-[#010101] font-manrope text-white">
      {/* ════════════════ THE SET ════════════════ */}
      <section className="relative w-full px-5 pb-14 pt-20 md:px-8 lg:px-12">
        {/* Light the screen throws onto the wall behind it */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-10 mx-auto h-[70vh] max-w-[1700px] blur-[110px] transition-opacity duration-1000",
            tvPower ? "wall-spill opacity-100" : "opacity-0",
          )}
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(255,255,255,0.10), rgba(120,140,190,0.05) 45%, transparent 72%)",
          }}
        />

        {/* Set beside remote, 86/14, running the full width of the page on the
            same padding as the channel guide below so both start and end on the
            same line. A grid rather than a flex row: it puts the bezel and the
            remote in one track, which stretches the remote to exactly the
            bezel's height, and drops the now-playing strip into a second row
            under the set alone. fr units rather than percentages so the column
            gap comes out of the tracks instead of overflowing them. */}
        <div className="relative grid w-full grid-cols-1 gap-10 lg:grid-cols-[83fr_17fr] lg:gap-8">
          {/* ── Panel ── */}
          <div className="flex w-full min-w-0 flex-col items-center">
            <div
              ref={tvContainerRef}
              className="w-full overflow-hidden rounded-[16px] bg-[#0a0a0a] shadow-[0_50px_100px_-30px_rgba(0,0,0,1)] ring-1 ring-white/[0.07]"
            >
              {/* Screen — full width, but never taller than the room left in
                  the window, so the set, stand and now-playing strip all land
                  in one viewport. Below that ceiling it is a plain 16:9 panel;
                  above it the box goes wide and the video letterboxes inside,
                  invisibly, since screen and bars are both black. */}
              <div className="tv-screen relative aspect-video max-h-[calc(100svh_-_10.5rem)] w-full overflow-hidden rounded-[16px] bg-black">
                <video
                  ref={videoRef}
                  className={cn(
                    "h-full w-full bg-black transition-opacity duration-300",
                    fillScreen ? "object-cover" : "object-contain",
                    crtOn && tvPower && "crt-picture",
                    tvPower ? "panel-wake" : "panel-sleep",
                    isSwitching && "opacity-0",
                  )}
                  playsInline
                  controls={false}
                />

                {/* Tuning — the picture resolves out of a blur */}
                {tvPower && isSwitching && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                    <span className={cn(LABEL, "text-neutral-500")}>
                      Tuning
                    </span>
                  </div>
                )}

                {/* On-screen display */}
                {tvPower && osdLines.length > 0 && (
                  <div className="osd-in absolute bottom-5 left-5 z-30 max-w-[80%]">
                    {osdLines.map((line, i) => (
                      <div
                        key={i}
                        className={
                          i === 0
                            ? "font-nichrome text-[26px] font-black uppercase leading-none tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.95)] sm:text-[34px]"
                            : "mt-1.5 font-manrope text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50"
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}

                {/* Guide overlay — same list vocabulary as the guide below */}
                {isCategoryMenuOpen && tvPower && (
                  <div className="absolute inset-0 z-30 flex flex-col bg-[#050505]/95 backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
                      <span className={LABEL}>Categories</span>
                      <span className={cn(LABEL, "text-neutral-700")}>
                        G · Esc to close
                      </span>
                    </div>
                    <div className="scrollbar-hide flex-1 overflow-y-auto p-2">
                      {categories.map((cat) => {
                        const on = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => selectCategoryFromMenu(cat)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-manrope text-[13px] transition-colors duration-150",
                              on
                                ? "bg-white/[0.06] font-semibold text-white"
                                : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                            )}
                          >
                            <span className="flex-1 truncate">{cat}</span>
                            {on && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#e50914]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Region overlay — the guide menu's twin */}
                {isRegionMenuOpen && tvPower && (
                  <div className="absolute inset-0 z-30 flex flex-col bg-[#050505]/95 backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
                      <span className={LABEL}>Region</span>
                      <span className={cn(LABEL, "text-neutral-700")}>
                        Esc to close
                      </span>
                    </div>
                    <div className="scrollbar-hide flex-1 overflow-y-auto p-2">
                      {regions.map((r) => {
                        const on = selectedRegion === r.code;
                        return (
                          <button
                            key={r.code}
                            onClick={() =>
                              selectRegionFromMenu(r.code, r.label)
                            }
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-manrope text-[13px] transition-colors duration-150",
                              on
                                ? "bg-white/[0.06] font-semibold text-white"
                                : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                            )}
                          >
                            <span className="flex-1 truncate">{r.label}</span>
                            {on && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#e50914]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No signal */}
                {tvPower && !currentChannel && !isSwitching && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
                    <Tv className="h-6 w-6 text-neutral-700" />
                    <span className={LABEL}>No signal</span>
                  </div>
                )}

                {/* Standby */}
                {!tvPower && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                    <span className="led-breathe h-1.5 w-1.5 rounded-full bg-[#e50914] shadow-[0_0_10px_rgba(229,9,20,0.8)]" />
                  </div>
                )}

                {/* ── The tube ── laid over everything, on-screen display
                    included: a real set draws its OSD with the same electron
                    gun, so the scanlines and the glass fall across it too.
                    Stacked in the order light reaches the eye. */}
                {crtOn && (
                  <>
                    <div
                      aria-hidden
                      className="crt-bloom pointer-events-none absolute inset-0 z-40"
                    />
                    <div
                      aria-hidden
                      className="crt-scanlines pointer-events-none absolute inset-0 z-40"
                    />
                    <div
                      aria-hidden
                      className="crt-mask pointer-events-none absolute inset-0 z-40"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-40 opacity-[0.05] mix-blend-overlay"
                      style={{
                        backgroundImage: STATIC_NOISE,
                        backgroundSize: "170px 170px",
                      }}
                    />
                    <div
                      aria-hidden
                      className="crt-glass pointer-events-none absolute inset-0 z-40"
                    />
                    {tvPower && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 overflow-hidden">
                        <div aria-hidden className="crt-roll w-full" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Now playing, under the set — with the keyboard remote opposite.
              Spans both columns so the shortcuts land on the page's right edge,
              flush with the remote, rather than stopping at the TV's edge. */}
          <div className="flex w-full flex-wrap items-center justify-between gap-x-8 gap-y-4 lg:col-span-2 lg:row-start-2">
            <div className="flex min-w-0 items-center gap-4">
              <span className={cn(LABEL, "shrink-0")}>Now playing</span>
              <span className="truncate font-manrope text-[15px] font-semibold tracking-[0.01em] text-white">
                {currentChannel ? currentChannel.name : "—"}
              </span>
              {currentChannel && (
                <>
                  <span className="h-3 w-px shrink-0 bg-white/[0.1]" />
                  <span className={cn(LABEL, "shrink-0 truncate")}>
                    {currentChannel.group}
                  </span>
                </>
              )}
              {/* Whatever the stream says is on air, when it says anything */}
              {nowPlayingTrack && (
                <>
                  <span className="h-3 w-px shrink-0 bg-white/[0.1]" />
                  <Music className="h-3 w-3 shrink-0 text-[#e50914]" />
                  <span className="truncate font-manrope text-[13px] tracking-[0.01em] text-white/70">
                    {[nowPlayingTrack.artist, nowPlayingTrack.title]
                      .filter(Boolean)
                      .join(" — ")}
                  </span>
                </>
              )}
            </div>

            {/* Keyboard remote — key caps borrowing the remote's own button
                treatment: dark fill, hairline ring, mono digit. */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
              {[
                ["↑↓", "Channel"],
                ["←→", "Volume"],
                ["0–9", "Jump"],
                ["M", "Mute"],
                ["L", "Last"],
                ["Z", "Zoom"],
                ["F", "Fullscreen"],
                ["G", "Guide"],
                ["P", "Power"],
              ].map(([key, action]) => (
                <span key={action} className="flex items-center gap-2">
                  <kbd className="flex h-[22px] min-w-[22px] items-center justify-center rounded-[6px] bg-white/[0.03] px-1.5 font-space text-[11px] leading-none tabular-nums text-neutral-300 ring-1 ring-white/[0.07]">
                    {key}
                  </kbd>
                  <span className="font-manrope text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    {action}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* ── Remote ── built like the real object, in the order a real
              handset puts things: IR window at the tip, power and info on the
              top shoulder, the keypad in the upper half, the volume and channel
              rockers where the thumb rests, then function keys and the red/
              green/yellow/blue teletext row above the battery door.

              The keys are laid out on one three-column grid from the shoulder
              down, so every column edge lines up the whole length of the body
              the way moulded key wells actually do. Sizes are fixed rather than
              stretched: the old layout distributed leftover column height with
              `mt-auto` between the groups, which tore the key field apart into
              islands separated by whatever gap happened to be left over. */}
          {/* Clicking anywhere in the shell fired a key, so the emitter blinks
              from the container rather than from thirty separate handlers. */}
          <div
            onClickCapture={pulseIr}
            className="relative mx-auto flex w-[196px] flex-col rounded-[34px] p-4 shadow-[0_2px_5px_rgba(0,0,0,0.9),0_14px_28px_-10px_rgba(0,0,0,0.95),0_48px_90px_-26px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.13),inset_0_-2px_10px_rgba(0,0,0,0.95)] ring-1 ring-black/85 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:w-auto lg:rounded-[40px] lg:p-5 xl:p-6"
            style={{
              backgroundImage:
                "linear-gradient(170deg, #33333a 0%, #1e1e23 18%, #131316 46%, #0d0d10 74%, #191920 100%)",
            }}
          >
            {/* Curved plastic: a sheen down the lit side, and the thin bounce
                of light that runs up the opposite edge. Kept as one overlay so
                the highlights sit above the body gradient but under the keys. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[34px] lg:rounded-[40px]"
              style={{
                backgroundImage:
                  "linear-gradient(103deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.018) 22%, transparent 42%, transparent 88%, rgba(255,255,255,0.035) 100%)",
              }}
            />

            {/* IR window at the tip. Dark red glass when idle — the lens is
                tinted, not black — and on a keypress the whole lens lights
                evenly and blooms onto the surrounding shell. No emitter dot
                behind it: a hard bright point reads as a pilot light, and what
                you actually see on a real handset is the glass itself glowing. */}
            <span className="relative mx-auto flex h-2 w-11 shrink-0 items-center justify-center lg:h-[9px] lg:w-12">
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -inset-x-2.5 -inset-y-1.5 rounded-full bg-[#ff4a2e] blur-[6px] transition-opacity duration-200",
                  irFiring ? "opacity-40 duration-[40ms]" : "opacity-0",
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "relative h-full w-full rounded-full ring-1 ring-black/80 transition-all duration-200",
                  irFiring
                    ? "bg-[#7c2416] shadow-[inset_0_0_3px_rgba(255,124,94,0.3)] duration-[40ms]"
                    : "bg-[#150809] shadow-[inset_0_1px_2px_rgba(0,0,0,0.95),inset_0_-1px_0_rgba(255,255,255,0.05)]",
                )}
              />
            </span>

            {/* The key field. The column's height tracks the set beside it,
                which moves with the viewport, so the two big groups take that
                slack on a flex basis and the small rows stay fixed — the field
                fills the shell at any height instead of being centred inside it
                with dead plastic at both ends, and it compresses rather than
                overflowing when the set is short. */}
            <div className="relative flex flex-1 flex-col justify-between gap-3 py-4 lg:gap-4 lg:py-5">
              {/* Shoulder — power set apart in red, info opposite it */}
              <div className="flex shrink-0 items-center justify-between px-0.5">
                <button
                  onClick={togglePower}
                  aria-label="Power"
                  aria-pressed={tvPower}
                  className={cn(
                    KEY_PRESS,
                    "flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#e05a44] via-[#bd3826] to-[#6f1a10] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-3px_5px_rgba(0,0,0,0.4),0_1px_1px_rgba(0,0,0,0.7),0_4px_9px_-1px_rgba(0,0,0,0.9)] ring-1 ring-black/75 hover:from-[#ea6853] hover:via-[#c94331] lg:h-12 lg:w-12",
                    !tvPower &&
                      "from-[#743026] via-[#5a2018] to-[#37120d] hover:from-[#7e372c] hover:via-[#622519]",
                  )}
                >
                  <Power
                    className={cn(
                      "h-[18px] w-[18px] transition-opacity duration-300 lg:h-5 lg:w-5",
                      tvPower ? "text-white" : "text-white/40",
                    )}
                  />
                </button>

                <button
                  onClick={showCurrentInfo}
                  aria-label="Channel info"
                  className={cn(
                    KEY,
                    KEY_PRESS,
                    "group flex h-11 w-11 items-center justify-center rounded-full lg:h-12 lg:w-12",
                  )}
                >
                  <Info
                    className={cn(GLYPH, "h-[18px] w-[18px] lg:h-5 lg:w-5")}
                  />
                </button>
              </div>

              {/* Keypad — the upper key field, three columns wide. Everything
                  below inherits these column edges. */}
              <div className="grid min-h-[140px] flex-1 basis-[188px] grid-cols-3 grid-rows-4 gap-1.5 lg:max-h-[248px] lg:gap-2">
                {[
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "clear",
                  "0",
                  "enter",
                ].map((k) => (
                  <button
                    key={k}
                    onClick={() => handleNumpad(k)}
                    aria-label={
                      k === "clear"
                        ? "Clear"
                        : k === "enter"
                          ? "Enter"
                          : `Channel ${k}`
                    }
                    className={cn(
                      KEY,
                      KEY_PRESS,
                      "group flex h-full min-h-[30px] items-center justify-center rounded-[10px]",
                      k === "clear" || k === "enter"
                        ? "font-manrope text-[8px] font-semibold uppercase tracking-[0.12em] text-[#9797a1] group-hover:text-white lg:text-[9px]"
                        : cn(GLYPH, "font-space text-[15px] tabular-nums"),
                    )}
                  >
                    {k === "clear" ? "Del" : k === "enter" ? "OK" : k}
                  </button>
                ))}
              </div>

              {/* Rockers — volume and channel two-way keys on the outer columns,
                  mute and guide stacked in the middle one so the cluster fills
                  the same three-column footprint as the keypad above it. */}
              <div className="grid min-h-[96px] flex-1 basis-[122px] grid-cols-3 items-stretch gap-1.5 lg:max-h-[176px] lg:gap-2">
                <div className={cn(ROCKER, "flex h-full flex-col")}>
                  <button
                    onClick={() => changeVolume(10)}
                    aria-label="Volume up"
                    className="group flex flex-1 items-center justify-center rounded-t-full transition-colors active:bg-black/30"
                  >
                    <Plus className={cn(GLYPH, "h-4 w-4")} />
                  </button>
                  <span
                    aria-hidden
                    className="h-px w-full shrink-0 bg-black/85 shadow-[0_1px_0_rgba(255,255,255,0.09)]"
                  />
                  <button
                    onClick={() => changeVolume(-10)}
                    aria-label="Volume down"
                    className="group flex flex-1 items-center justify-center rounded-b-full transition-colors active:bg-black/30"
                  >
                    <Minus className={cn(GLYPH, "h-4 w-4")} />
                  </button>
                </div>

                <div className="flex h-full flex-col gap-1.5 lg:gap-2">
                  <button
                    onClick={toggleMute}
                    aria-label={muted ? "Unmute" : "Mute"}
                    aria-pressed={muted}
                    className={cn(
                      KEY,
                      KEY_PRESS,
                      "group flex flex-1 items-center justify-center rounded-full",
                    )}
                  >
                    {muted || volume === 0 ? (
                      <VolumeX className="h-[18px] w-[18px] text-[#e0685a] transition-colors group-hover:text-[#f08376]" />
                    ) : (
                      <Volume2 className={cn(GLYPH, "h-[18px] w-[18px]")} />
                    )}
                  </button>

                  <button
                    onClick={toggleCategoryMenu}
                    aria-label="Guide"
                    aria-pressed={isCategoryMenuOpen}
                    className={cn(
                      KEY,
                      KEY_PRESS,
                      "group flex flex-1 items-center justify-center rounded-full",
                      isCategoryMenuOpen && "from-[#4a4a54] to-[#2b2b31]",
                    )}
                  >
                    <LayoutGrid
                      className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        isCategoryMenuOpen
                          ? "text-white"
                          : "text-[#c6c6d0] group-hover:text-white",
                      )}
                    />
                  </button>
                </div>

                <div className={cn(ROCKER, "flex h-full flex-col")}>
                  <button
                    onClick={() => changeChannelRelative(1)}
                    aria-label="Channel up"
                    className="group flex flex-1 items-center justify-center rounded-t-full transition-colors active:bg-black/30"
                  >
                    <ChevronUp className={cn(GLYPH, "h-4 w-4")} />
                  </button>
                  <span
                    aria-hidden
                    className="h-px w-full shrink-0 bg-black/85 shadow-[0_1px_0_rgba(255,255,255,0.09)]"
                  />
                  <button
                    onClick={() => changeChannelRelative(-1)}
                    aria-label="Channel down"
                    className="group flex flex-1 items-center justify-center rounded-b-full transition-colors active:bg-black/30"
                  >
                    <ChevronDown className={cn(GLYPH, "h-4 w-4")} />
                  </button>
                </div>
              </div>

              {/* Legends printed on the shell between the rockers and the keys
                  below, naming the two columns that are only glyphs. */}
              <div className="-mt-1 grid shrink-0 grid-cols-3 gap-1.5 text-center lg:gap-2">
                <span className={ENGRAVED}>Vol</span>
                <span className={ENGRAVED}>Menu</span>
                <span className={ENGRAVED}>Ch</span>
              </div>

              {/* Function keys — the three you reach for while watching, so
                  they get real keys rather than the coloured shortcut caps
                  below. Capsules, matching the mute and menu keys: the shell
                  keeps two key languages, rounded rectangles for the keypad and
                  capsules for everything that is a function rather than a
                  digit, which tells them apart at a glance without a third
                  colour. They take slack along with the keypad and rockers so
                  the bottom of the shell carries its share of the height rather
                  than trailing off into slivers. */}
              <div className="grid min-h-[38px] flex-1 basis-[46px] grid-cols-3 gap-1.5 lg:max-h-[58px] lg:gap-2">
                {[
                  {
                    label: "Prev",
                    icon: ArrowLeftRight,
                    onClick: jumpToPreviousChannel,
                    on: false,
                  },
                  {
                    label: fillScreen ? "Fill" : "Fit",
                    icon: Crop,
                    onClick: cyclePictureSize,
                    on: fillScreen,
                  },
                  {
                    label: "Pip",
                    icon: PictureInPicture2,
                    onClick: togglePip,
                    on: false,
                  },
                ].map(({ label, icon: Icon, onClick, on }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    aria-pressed={on}
                    className={cn(
                      KEY,
                      KEY_PRESS,
                      "group flex h-full flex-col items-center justify-center gap-[3px] rounded-full font-manrope text-[8px] font-semibold uppercase tracking-[0.12em]",
                      on
                        ? "from-[#4a4a54] to-[#2b2b31] text-white"
                        : "text-[#a8a8b2] group-hover:text-white",
                    )}
                  >
                    <Icon className="h-[15px] w-[15px]" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Colour keys — the red/green/yellow/blue row, carrying the
                  set-specific shortcuts the way teletext keys always have, and
                  each earning its colour rather than being dealt one: red is
                  the retry/action key, green go-bigger, yellow options, blue
                  display. Each is labelled underneath, since a colour alone
                  tells you nothing.

                  They are moulded caps, not painted strips — enough height to
                  read as pressable, with the domed shading a rubber cap gets:
                  light along the top edge, shadow gathering under the bottom
                  lip. */}
              <div className="grid shrink-0 grid-cols-4 gap-1.5 lg:gap-2">
                {[
                  {
                    label: "Reload",
                    onClick: reloadCurrent,
                    from: "#d0483a",
                    to: "#8a2317",
                    on: false,
                    dim: false,
                  },
                  {
                    label: "Full",
                    onClick: goFullscreen,
                    from: "#3fa85c",
                    to: "#186030",
                    on: false,
                    dim: false,
                  },
                  {
                    label: "Region",
                    onClick: toggleRegionMenu,
                    from: "#e8c53a",
                    to: "#a58210",
                    on: isRegionMenuOpen,
                    dim: false,
                  },
                  /* Only CRT dims when off — it is the one key here that holds a
                     lasting state. Region merely opens a menu, so greying it
                     whenever that menu is shut would read as "disabled". */
                  {
                    label: "CRT",
                    onClick: toggleCrt,
                    from: "#3d7fd6",
                    to: "#1a4784",
                    on: crtOn,
                    dim: !crtOn,
                  },
                ].map(({ label, onClick, from, to, on, dim }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    aria-pressed={on}
                    aria-label={label}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        KEY_PRESS,
                        "block h-6 w-full rounded-[7px] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-3px_5px_rgba(0,0,0,0.32),0_2px_5px_rgba(0,0,0,0.85)] ring-1 ring-black/70 group-hover:brightness-110 lg:h-7",
                        dim && "opacity-35 saturate-50",
                      )}
                      style={{
                        backgroundImage: `linear-gradient(to bottom, ${from} 0%, ${from} 22%, ${to} 100%)`,
                      }}
                    />
                    <span
                      className={cn(
                        "font-manrope text-[8px] font-semibold uppercase tracking-[0.1em] transition-colors",
                        on
                          ? "text-white"
                          : "text-[#82828d] group-hover:text-white",
                      )}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Battery-door seam, the way the real shell is moulded */}
            <span
              aria-hidden
              className="h-px w-full shrink-0 bg-black/60 shadow-[0_1px_0_rgba(255,255,255,0.045)]"
            />
          </div>
        </div>
      </section>

      {/* ════════════════ CHANNEL GUIDE ════════════════ */}
      <section className="w-full px-5 pb-28 md:px-8 lg:px-12">
        {/* Header */}
        <h2 className="pb-7 font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
          Channel Guide
        </h2>

        {/* Search — held to a readable measure, with the region beside it */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="group flex min-w-[240px] max-w-[640px] flex-1 items-center gap-3 border-b border-white/[0.09] pb-2.5 transition-colors focus-within:border-white/30">
            <Search className="h-4 w-4 shrink-0 text-white/25 transition-colors group-focus-within:text-white/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a channel"
              aria-label="Find a channel"
              spellCheck={false}
              className="w-full bg-transparent font-manrope text-[15px] text-white outline-none placeholder:text-white/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear"
                className="shrink-0 font-manrope text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600 transition-colors hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {regions.length > 1 && (
            <div className="flex shrink-0 items-center gap-3 pb-1.5">
              <span className={LABEL}>Region</span>
              <Select
                value={selectedRegion}
                onValueChange={(value) => {
                  userPickedRegion.current = true;
                  setSelectedRegion(value);
                }}
              >
                {/* Stripped back to the page's vocabulary: no box, no fill —
                    just the value and a chevron, like the plain-text filters
                    everywhere else here. The panel does the work instead. */}
                <SelectTrigger
                  aria-label="Region"
                  className="h-auto gap-2 border-0 bg-transparent p-0 font-manrope text-[15px] font-semibold tracking-[0.01em] text-white shadow-none transition-colors hover:text-white/75 focus-visible:ring-0 data-[size=default]:h-auto [&>svg]:size-3.5 [&>svg]:text-white/35 [&>svg]:transition-transform [&>svg]:duration-200 [&[data-state=open]>svg]:rotate-180"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="end"
                  sideOffset={12}
                  className="max-h-[340px] min-w-[210px] rounded-xl border-0 bg-[#0b0b0b] p-1.5 shadow-[0_28px_70px_-16px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.09]"
                >
                  {regions.map((r) => (
                    <SelectItem
                      key={r.code}
                      value={r.code}
                      /* The tick is forced: the base item paints every
                         descendant on focus, and the highlighted row is always
                         focused, so an unflagged colour never lands. */
                      className="rounded-lg px-3 py-2 font-manrope text-[13.5px] tracking-[0.01em] text-white/55 transition-colors focus:bg-white/[0.06] focus:text-white data-[state=checked]:font-semibold data-[state=checked]:text-white [&_svg]:size-3.5 [&_svg]:!text-[#e50914]"
                    >
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Category filter — the app's plain-text filter row */}
        <div className="mb-6 flex min-w-0 flex-wrap items-center gap-x-8 gap-y-3 lg:gap-x-10">
          {/* Favourites sit alongside the categories and narrow with them, so
              you can hold "my channels" and "sports" at the same time. */}
          {favourites.size > 0 && (
            <button
              onClick={() => setFavouritesOnly((on) => !on)}
              aria-pressed={favouriteFilterOn}
              className={cn(
                "flex flex-col items-stretch font-manrope text-[13px] tracking-[0.01em] transition-colors duration-200",
                favouriteFilterOn
                  ? "font-semibold text-white"
                  : "text-white/45 hover:text-white/80",
              )}
            >
              <span className="flex items-center gap-1.5">
                <Star
                  className={cn(
                    "h-3 w-3",
                    favouriteFilterOn ? "text-[#e8c53a]" : "text-current",
                  )}
                  fill={favouriteFilterOn ? "currentColor" : "none"}
                />
                Favourites
                <span className="font-space text-[11px] tabular-nums text-neutral-600">
                  {favourites.size}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "mt-[3px] h-[1.5px] rounded-full transition-colors duration-200",
                  favouriteFilterOn ? "bg-white" : "bg-transparent",
                )}
              />
            </button>
          )}

          {categories.map((cat) => {
            const on = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  showOsd(["Category", cat]);
                }}
                aria-pressed={on}
                className={cn(
                  "flex flex-col items-stretch font-manrope text-[13px] tracking-[0.01em] transition-colors duration-200",
                  on
                    ? "font-semibold text-white"
                    : "text-white/45 hover:text-white/80",
                )}
              >
                {cat}
                <span
                  aria-hidden
                  className={cn(
                    "mt-[3px] h-[1.5px] rounded-full transition-colors duration-200",
                    on ? "bg-white" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Rows — the list gains columns instead of length as the page widens,
            so a long playlist stays scannable on a wide display. */}
        <div className="grid grid-cols-1 border-l border-t border-white/[0.08] md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {guideChannels.map((channel) => {
            const num = channelNumber.get(channel.id) ?? 0;
            const isActive = currentChannel?.url === channel.url;
            const starred = favourites.has(channel.url);
            return (
              /* The star is a sibling of the row, not a child: a button inside a
                 button is invalid, and nesting them would make the star's click
                 tune the channel as well as favouriting it. */
              <div
                key={channel.id}
                className={cn(
                  "group relative flex items-stretch border-b border-r border-white/[0.08] transition-colors duration-150",
                  isActive ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
                )}
              >
                <button
                  onClick={() => {
                    if (!tvPower) setTvPower(true);
                    playChannel(channel);
                    if (
                      typeof window !== "undefined" &&
                      window.innerWidth < 1024
                    )
                      tvContainerRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-4 pr-2 text-left"
                >
                  <span
                    className={cn(
                      "w-9 shrink-0 font-space text-[13px] tabular-nums",
                      isActive ? "text-white" : "text-neutral-600",
                    )}
                  >
                    {num.toString().padStart(3, "0")}
                  </span>

                  <ChannelLogo channel={channel} />

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate font-manrope text-[14px] tracking-[0.01em] transition-colors",
                        isActive
                          ? "font-semibold text-white"
                          : "text-neutral-300 group-hover:text-white",
                      )}
                    >
                      {channel.name}
                    </span>
                    <span className={cn(LABEL, "mt-1 block truncate")}>
                      {channel.group}
                    </span>
                  </span>

                  <span
                    className="flex w-5 shrink-0 items-end justify-end gap-[2px]"
                    aria-hidden
                  >
                    {isActive &&
                      [0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-[2px] rounded-full bg-[#e50914]"
                          style={{
                            height: 11,
                            transformOrigin: "bottom",
                            animation: `eq 0.9s ease-in-out ${i * 0.15}s infinite`,
                          }}
                        />
                      ))}
                  </span>
                </button>

                {/* The star is boxed into a centred chip rather than stretched
                    down the row's full height: an invisible full-height strip
                    meant the dead space above and below the icon favourited the
                    channel when it read as ordinary row you could click to
                    tune. The wrapper holds the edge inset so only the chip is
                    ever clickable. */}
                <span className="flex shrink-0 items-center pr-2.5">
                  <button
                    onClick={() => toggleFavourite(channel.url)}
                    aria-pressed={starred}
                    aria-label={
                      starred
                        ? `Remove ${channel.name} from favourites`
                        : `Add ${channel.name} to favourites`
                    }
                    title={
                      starred ? "Remove from favourites" : "Add to favourites"
                    }
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full transition-colors duration-150",
                      /* Unstarred stars stay faint until hover or keyboard focus,
                         so 300 rows aren't 300 competing icons — but they must
                         never be fully invisible: a touch device has no hover, and
                         a transparent star would make favouriting unreachable.
                         The hover plate is what makes it read as a control
                         instead of a speck marooned at the cell's edge. */
                      starred
                        ? "text-[#e8c53a] hover:bg-[#e8c53a]/[0.12]"
                        : "text-white/[0.13] hover:bg-white/[0.07] hover:text-white/70 focus-visible:bg-white/[0.07] focus-visible:text-white/70 group-hover:text-white/30 [@media(hover:none)]:text-white/30",
                    )}
                  >
                    <Star
                      className="h-[15px] w-[15px]"
                      fill={starred ? "currentColor" : "none"}
                    />
                  </button>
                </span>
              </div>
            );
          })}
        </div>

        {guideChannels.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className={LABEL}>
              {query
                ? `No channels match “${query}”`
                : hiddenCount > 0
                  ? "Every channel here failed to tune"
                  : "No channels in this category"}
            </p>
            {!query && hiddenCount > 0 && (
              <button
                onClick={resetDeadChannels}
                className="font-manrope text-[14px] font-semibold tracking-[0.01em] text-white underline decoration-white/30 decoration-1 underline-offset-[5px] transition-colors hover:decoration-white"
              >
                Restore {hiddenCount} hidden channels
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* Playlist logo URLs rot — plenty 404 or hotlink-block. A dead <img> leaves an
   empty box in the row, so fall back to the channel's initial instead. */
function ChannelLogo({ channel }: { channel: Channel }) {
  const [broken, setBroken] = useState(false);
  const usable = channel.logo && !broken;

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white/[0.04] ring-1 ring-white/[0.06]">
      {usable ? (
        <img
          src={channel.logo}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-contain p-[5px]"
        />
      ) : (
        <span className="font-manrope text-[14px] font-semibold text-neutral-600">
          {channel.name.trim()[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </span>
  );
}
