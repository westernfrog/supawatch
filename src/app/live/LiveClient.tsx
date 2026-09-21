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
import { APP_NAME } from "@/lib/app-name";
import { parseId3, type Id3Text } from "@/lib/id3";
import {
  Select,
  SelectContent,
  SelectGroup,
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
  ChevronLeft,
  ChevronRight,
  Globe2,
  Maximize,
  RotateCw,
  Check,
  X,
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

const APP_STORAGE_PREFIX = APP_NAME.toLowerCase();
const DEAD_KEY = `${APP_STORAGE_PREFIX}:dead-channels`;
const CRT_KEY = `${APP_STORAGE_PREFIX}:crt`;
const CRT_EVENT = `${APP_STORAGE_PREFIX}:crt-change`;
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

const FAV_KEY = `${APP_STORAGE_PREFIX}:favourites`;
const LAST_KEY = `${APP_STORAGE_PREFIX}:last-channel`;

const FAV_EVENT = `${APP_STORAGE_PREFIX}:favourites-change`;

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
  const [fillScreen, setFillScreen] = useState(true);

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
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest('[role="dialog"], .tv-osd-menu')) return;
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

  const remoteNavigate = (direction: number) => {
    const menu = document.querySelector(".tv-osd-menu");
    if (menu) {
      const buttons = Array.from(menu.querySelectorAll<HTMLButtonElement>("[data-menu-item]"));
      const index = buttons.findIndex(button => button.dataset.menuFocus === "true");
      buttons[(index + direction + buttons.length) % buttons.length]?.focus();
    } else changeChannelRelative(direction === 1 ? -1 : 1);
  };
  const remoteOK = () => {
    const focused = document.querySelector<HTMLButtonElement>('.tv-osd-menu [data-menu-focus="true"]');
    if (focused) focused.click(); else if (typedRef.current) handleNumpad("enter"); else showCurrentInfo();
  };
  const LABEL =
    "font-manrope text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600";

  return (
    <div className="live-room min-h-screen w-full bg-[#010101] font-manrope text-white">
      {/* ════════════════ THE SET ════════════════ */}
      <section className="relative w-full px-(--gutter) pb-14 pt-20">
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
        <div className="live-set-layout">
          {/* ── Panel ── */}
          <div className="flex w-full min-w-0 flex-col items-center">
            <div
              ref={tvContainerRef}
              className="w-full overflow-hidden rounded-[16px] bg-[#0a0a0a] shadow-[0_50px_100px_-30px_rgba(0,0,0,1)] ring-1 ring-white/[0.07]"
            >
              {/* Screen — full width, but never taller than the room left in
                  the window, so the set, stand and now-playing strip all land
                  in one viewport. Below that ceiling it is a plain 16:9 panel;
                  above it the box goes wide. Fill crops the picture to this
                  screen; Fit preserves the stream’s original aspect ratio. */}
              <div className="tv-screen relative aspect-video max-h-[calc(100svh_-_10.5rem)] w-full overflow-hidden rounded-[16px] bg-black">
                {/* The collapse rides a wrapper rather than the video itself:
                    the CRT treatment is also an animation, and two of them on
                    one element fight over the `animation` property. Split in
                    two they compose — the wrapper squashes and surges, the
                    video keeps its own scanlines.

                    Both directions are driven straight off tvPower and hold
                    their last frame, so the steady on and off states are the
                    ends of the animations themselves. An earlier version timed
                    a transient state out with setTimeout and the two could
                    desync — the class cleared a frame in, cutting the collapse
                    off before it started. */}
                <div
                  className={cn(
                    "absolute inset-0 h-full w-full",
                    tvPower ? "crt-on-picture" : "crt-off-picture",
                  )}
                >
                  <video
                    ref={videoRef}
                    className={cn(
                      "h-full w-full bg-black transition-opacity duration-300",
                      fillScreen ? "object-cover" : "object-contain",
                      crtOn && tvPower && "crt-picture",
                      isSwitching && "opacity-0",
                    )}
                    playsInline
                    controls={false}
                  />
                </div>

                {/* The bar of light the picture collapses into, and strikes
                    back out of. Both animations end at zero opacity, so it is
                    invisible at rest in either state. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
                >
                  <span className="crt-beam">
                    <span className="crt-beam-bloom">
                      <i className={tvPower ? "crt-beam-on" : "crt-beam-off"} />
                    </span>
                    <span
                      className={cn(
                        "crt-beam-core",
                        tvPower ? "crt-beam-on" : "crt-beam-off",
                      )}
                    />
                  </span>
                </div>

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
                  <div className={cn("tv-osd osd-in", /^(VOL|MUTED)/.test(osdLines[0]) ? "tv-osd-volume" : "tv-osd-info")} role="status" aria-live="polite">
                    {/^(VOL|MUTED)/.test(osdLines[0]) ? <>
                      <div className="tv-osd-icon">{muted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}</div>
                      <div><span className="tv-osd-caption">{muted ? "Sound muted" : "Volume"}</span><div className="tv-volume-track" role="meter" aria-label="Volume" aria-valuemin={0} aria-valuemax={100} aria-valuenow={muted ? 0 : Math.round(volume * 100)}>{Array.from({ length: 20 }, (_, i) => <i key={i} data-filled={!muted && i < Math.round(volume * 20)} />)}</div></div>
                      <strong>{muted ? "0" : Math.round(volume * 100)}</strong>
                    </> : <><div className="tv-channel-badge">{osdLines[0].startsWith("CH ") ? <><span>CHANNEL</span><strong>{osdLines[0].slice(3)}</strong></> : <Tv size={24} />}</div><div className="tv-osd-details"><span className="tv-osd-caption">{osdLines[0].startsWith("CH ") ? osdLines[2] ?? "Live television" : osdLines[0]}</span><strong>{osdLines[1] ?? (osdLines[0].startsWith("CH ") ? "Enter a channel number" : `${APP_NAME} TV`)}</strong>{osdLines[3] && <span>{osdLines[3]}</span>}</div></>}
                  </div>
                )}

                {/* Guide overlay */}
                {isCategoryMenuOpen && tvPower && (
                  <TvMenu
                    title="Categories"
                    exitHint="G"
                    items={categories.map((cat) => ({
                      key: cat,
                      label: cat,
                    }))}
                    selected={selectedCategory}
                    onSelect={selectCategoryFromMenu}
                    onClose={() => setIsCategoryMenuOpen(false)}
                  />
                )}

                {/* Region overlay — the guide menu's twin */}
                {isRegionMenuOpen && tvPower && (
                  <TvMenu
                    title="Region"
                    exitHint="Esc"
                    items={regions.map((r) => ({
                      key: r.code,
                      label: r.label,
                    }))}
                    selected={selectedRegion}
                    onSelect={(code) =>
                      selectRegionFromMenu(
                        code,
                        regions.find((r) => r.code === code)?.label ?? code,
                      )
                    }
                    onClose={() => setIsRegionMenuOpen(false)}
                  />
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
          <div className="live-now-playing flex w-full flex-wrap items-center justify-between gap-x-8 gap-y-4">
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
                  <Music className="h-3 w-3 shrink-0 text-neutral-300" />
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
          <aside className="tv-remote" aria-label="TV remote" onClickCapture={pulseIr}>
            <div className="remote-emitter" data-active={irFiring} aria-hidden="true" />
            <div className="remote-shoulder"><button className="remote-key remote-power" onClick={togglePower} aria-label="Power" aria-pressed={tvPower}><Power size={19} /></button><span className="remote-brand">{APP_NAME}<span>TELEVISION</span></span><button className="remote-key" onClick={showCurrentInfo} aria-label="Channel info"><Info size={18} /></button></div>
            <div className="remote-numberpad">{["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "enter"].map(key => <button className="remote-key" key={key} onClick={() => handleNumpad(key)} aria-label={key === "clear" ? "Clear channel number" : key === "enter" ? "Enter channel number" : `Channel ${key}`}>{key === "clear" ? <span>DEL</span> : key === "enter" ? <span>ENTER</span> : key}</button>)}</div>
            <div className="remote-dial"><button className="dial-up" onClick={() => remoteNavigate(-1)} aria-label="Navigate up"><ChevronUp /></button><button className="dial-left" onClick={() => changeVolume(-10)} aria-label="Lower volume"><ChevronLeft /></button><button className="dial-ok" onClick={remoteOK} aria-label="Select or show channel info">OK</button><button className="dial-right" onClick={() => changeVolume(10)} aria-label="Raise volume"><ChevronRight /></button><button className="dial-down" onClick={() => remoteNavigate(1)} aria-label="Navigate down"><ChevronDown /></button></div>
            <div className="remote-rockers"><div className="remote-rocker"><button onClick={() => changeVolume(10)} aria-label="Volume up"><Plus size={19} /></button><span>VOL</span><button onClick={() => changeVolume(-10)} aria-label="Volume down"><Minus size={19} /></button></div><div className="remote-center-keys"><button className="remote-key" onClick={toggleMute} aria-label="Mute" aria-pressed={muted}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><button className="remote-key" onClick={toggleCategoryMenu} aria-label="Channel menu" aria-expanded={isCategoryMenuOpen}><LayoutGrid size={17} /></button><span>MENU</span></div><div className="remote-rocker"><button onClick={() => changeChannelRelative(1)} aria-label="Channel up"><ChevronUp size={20} /></button><span>CH</span><button onClick={() => changeChannelRelative(-1)} aria-label="Channel down"><ChevronDown size={20} /></button></div></div>
            <div className="remote-functions">{[{ label: "Previous", icon: ArrowLeftRight, action: jumpToPreviousChannel }, { label: fillScreen ? "Fill" : "Fit", icon: Crop, action: cyclePictureSize }, { label: "PiP", icon: PictureInPicture2, action: togglePip }].map(({ label, icon: Icon, action }) => <button className="remote-key" key={label} onClick={action}><Icon size={16} /><span>{label}</span></button>)}</div>
            <div className="remote-colors">{[{ label: "Reload", icon: RotateCw, action: reloadCurrent }, { label: "Full", icon: Maximize, action: goFullscreen }, { label: "Region", icon: Globe2, action: toggleRegionMenu }, { label: "CRT", icon: Tv, action: toggleCrt }].map(({ label, icon: Icon, action }, index) => <button key={label} onClick={action} aria-label={label} aria-pressed={label === "CRT" ? crtOn : undefined} aria-expanded={label === "Region" ? isRegionMenuOpen : undefined}><span className={`remote-color remote-color-${index}`}><Icon size={14} /></span><span>{label}</span></button>)}</div>
            <div className="remote-base" aria-hidden="true"><span />SW / 01</div>
          </aside>
        </div>
      </section>

      {/* ════════════════ CHANNEL GUIDE ════════════════ */}
      <section className="channel-guide w-full px-(--gutter) pb-28">
        {/* Header */}
        <header className="channel-guide-heading"><div><p className="eyebrow">Something’s always on</p><h2>Find your frequency.</h2></div><p><span className="live-dot" />{guideChannels.length} channels <span>/ {regions.find(region => region.code === selectedRegion)?.label ?? "Live TV"}</span></p></header>

        {/* Search — held to a readable measure, with the region beside it */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="guide-search group flex min-w-0 max-w-[640px] flex-1 items-center gap-3">
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
                  <SelectGroup>{regions.map((r) => (
                    <SelectItem
                      key={r.code}
                      value={r.code}
                      /* The tick is forced: the base item paints every
                         descendant on focus, and the highlighted row is always
                         focused, so an unflagged colour never lands. */
                      className="rounded-lg px-3 py-2 font-manrope text-[13.5px] tracking-[0.01em] text-white/55 transition-colors focus:bg-white/[0.06] focus:text-white data-[state=checked]:font-semibold data-[state=checked]:text-white [&_svg]:size-3.5 [&_svg]:!text-neutral-300"
                    >
                      {r.label}
                    </SelectItem>
                  ))}</SelectGroup>
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
        <div className="guide-grid">
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
                data-active={isActive}
                className={cn(
                  "guide-channel group relative flex items-stretch transition-colors duration-150",
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
                      "grid size-11 place-items-center rounded-full transition-colors duration-150",
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

/* On-screen menus keep the live picture visible and support keyboard navigation. */
function TvMenu({
  title,
  items,
  selected,
  onSelect,
  onClose,
  exitHint,
}: {
  title: string;
  items: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  exitHint: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const active = root.current?.querySelector<HTMLButtonElement>('[aria-current="true"]') ?? root.current?.querySelector<HTMLButtonElement>("[data-menu-item]");
    active?.focus({ preventScroll: true });
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <div className="tv-menu-layer absolute inset-0 flex">
    <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 cursor-default bg-black/30" />
    <div ref={root} className="tv-osd-menu tv-menu-in" role="region" aria-label={`${title} menu`} onKeyDown={event => {
      if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[data-menu-item]") ?? []);
        const index = buttons.findIndex(button => button === document.activeElement);
        buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      }
      if (event.key === "Escape" || event.key.toLowerCase() === exitHint.toLowerCase()) { event.preventDefault(); event.stopPropagation(); onClose(); }
    }}>
      <header><div><span className="tv-osd-caption">{APP_NAME} TV</span><h3>{title === "Region" ? "Around the world" : "What’s your mood?"}</h3></div><button onClick={onClose} aria-label={`Close ${title.toLowerCase()} menu`}><X size={18} /></button></header>
      <div className="tv-menu-options">{items.map((item, index) => <button key={item.key} data-menu-item data-menu-focus={undefined} onFocus={event => { root.current?.querySelectorAll<HTMLElement>("[data-menu-item]").forEach(button => { button.dataset.menuFocus = "false"; }); event.currentTarget.dataset.menuFocus = "true"; }} aria-current={item.key === selected ? "true" : undefined} onClick={() => onSelect(item.key)}><span>{String(index + 1).padStart(2, "0")}</span><span>{item.label}</span>{item.key === selected && <Check size={16} />}</button>)}</div>
      <footer><span><kbd>↑ ↓</kbd> Browse</span><span><kbd>Enter</kbd> Select</span><span><kbd>{exitHint}</kbd> Close</span></footer>
    </div>
  </div>;
}

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
