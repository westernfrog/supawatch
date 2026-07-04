/* ── Taste profile ─────────────────────────────────────────────────────────
   A tiny on-device recommendation engine. Every meaningful interaction
   (opening a details modal, hitting Watch, visiting a detail page) records
   the title into localStorage with a weight. From that history we derive:

     · anchors    — the strongest recent titles ("Because you watched …")
     · topGenres  — weighted favourite genres (drives a "Made for you" query)
     · leanType   — whether the user leans movie, tv, or mixed
     · recent     — last-touched titles ("Jump back in")
     · seenIds    — everything interacted with, to de-dupe rec rows

   Scores decay with a ~10-day half-life so tastes stay current, and the
   store is capped so one binge can't dominate forever. All storage access
   is wrapped — private mode / SSR simply degrade to "no profile". */

export type MediaType = "movie" | "tv";

export type TasteInput = {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
};

export type TasteRecord = TasteInput & {
  weight: number;
  count: number;
  lastTs: number;
};

export type TasteProfile = {
  /* scored records, strongest first */
  items: (TasteRecord & { score: number })[];
  anchors: TasteRecord[];
  topGenres: number[];
  leanType: MediaType | "mixed";
  recent: TasteRecord[];
  seenIds: number[];
};

/* Interaction weights — stronger intent, stronger signal. */
export const TASTE_WEIGHT = {
  browse: 2, // opened a details modal
  visit: 3, // landed on a detail page
  watch: 5, // opened the watch player
} as const;

const KEY = "sw-taste-v1";
const MAX_RECORDS = 80;
const MAX_ITEM_WEIGHT = 40;
const HALF_LIFE_DAYS = 10;

type Store = { v: 1; items: Record<string, TasteRecord> };

function readStore(): Store | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Store;
    if (parsed?.v !== 1 || typeof parsed.items !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full or blocked — recommendations just stay stale */
  }
}

function decayedScore(record: TasteRecord, now: number): number {
  const ageDays = Math.max(0, now - record.lastTs) / 86400000;
  return record.weight * Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export function recordTaste(input: TasteInput, weight: number) {
  if (typeof window === "undefined" || !input.id || !input.title) return;

  const store = readStore() ?? { v: 1 as const, items: {} };
  const key = `${input.media_type}-${input.id}`;
  const now = Date.now();
  const prev = store.items[key];

  store.items[key] = {
    ...input,
    genre_ids: input.genre_ids?.length ? input.genre_ids : prev?.genre_ids ?? [],
    poster_path: input.poster_path ?? prev?.poster_path ?? null,
    backdrop_path: input.backdrop_path ?? prev?.backdrop_path ?? null,
    weight: Math.min((prev?.weight ?? 0) + weight, MAX_ITEM_WEIGHT),
    count: (prev?.count ?? 0) + 1,
    lastTs: now,
  };

  /* Cap the store — evict the weakest signals first. */
  const entries = Object.entries(store.items);
  if (entries.length > MAX_RECORDS) {
    entries
      .sort(([, a], [, b]) => decayedScore(a, now) - decayedScore(b, now))
      .slice(0, entries.length - MAX_RECORDS)
      .forEach(([k]) => delete store.items[k]);
  }

  writeStore(store);
}

export function getTasteProfile(): TasteProfile | null {
  if (typeof window === "undefined") return null;
  const store = readStore();
  if (!store) return null;

  const now = Date.now();
  const items = Object.values(store.items)
    .map((record) => ({ ...record, score: decayedScore(record, now) }))
    .filter((record) => record.score > 0.1)
    .sort((a, b) => b.score - a.score);

  if (items.length === 0) return null;

  /* Anchors — shuffle the strongest handful so "Because you watched"
     rotates between visits instead of pinning to one title. */
  const pool = items.slice(0, 6);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const anchors = pool.slice(0, 2);

  const genreScores = new Map<number, number>();
  let movieScore = 0;
  let tvScore = 0;
  for (const record of items) {
    if (record.media_type === "movie") movieScore += record.score;
    else tvScore += record.score;
    for (const genre of record.genre_ids ?? []) {
      genreScores.set(genre, (genreScores.get(genre) ?? 0) + record.score);
    }
  }
  const topGenres = [...genreScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  const total = movieScore + tvScore;
  const leanType: TasteProfile["leanType"] =
    total === 0 || Math.min(movieScore, tvScore) / total > 0.3
      ? "mixed"
      : movieScore > tvScore
        ? "movie"
        : "tv";

  const recent = [...items]
    .sort((a, b) => b.lastTs - a.lastTs)
    .filter((record) => record.poster_path || record.backdrop_path)
    .slice(0, 12);

  return {
    items,
    anchors,
    topGenres,
    leanType,
    recent,
    seenIds: items.map((record) => record.id),
  };
}
