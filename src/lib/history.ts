/* ── Watch history ─────────────────────────────────────────────────────────
   The permanent record. Where taste.ts keeps a *decaying* profile tuned for
   recommendations — capped at 80 titles, half-life 10 days, aggregate weight
   only — this keeps one immutable row per play, forever, with a timestamp.

   The two stores answer different questions and neither can serve the other:

     taste.ts   "what should we show you next?"   — recent, weighted, lossy
     history.ts "what have you actually watched?" — complete, flat, honest

   Only genuine watches land here. Opening a details modal or reading a
   detail page feeds taste.ts and nothing else; claiming those as views
   would inflate every number on the stats page into fiction.

   Storage is localStorage, so history is per-browser and dies with the site
   data. That makes export/import a core feature rather than a convenience —
   see exportHistory / importHistory. Every access is wrapped: SSR and
   private mode degrade to an empty history, never an exception. */

export type WatchMediaType = "movie" | "tv";

export type WatchEvent = {
  id: number;
  /* media_type, short-keyed — this array is the bulk of the payload and
     gets serialized on every write. */
  t: WatchMediaType;
  /* epoch ms. One row per play, so rewatches are counted, not collapsed. */
  ts: number;
  /* Snapshots taken at watch time. TMDB re-titles and re-categorizes things;
     a history that silently rewrites itself is worse than one that's stale.
     All optional — they're re-hydratable from `id` if we ever drop them. */
  g?: number[];
  n?: string;
  p?: string | null;
  /* Season and episode, for TV. Without these a 62-episode binge collapses
     into one row and the dedupe window below swallows every episode after
     the first — so they're what make a TV history mean anything. */
  sn?: number;
  ep?: number;
  /* Runtime in minutes, when the caller knows it. Note this is the runtime
     the user *opened*, not measured playback — the players are third-party
     iframes and report nothing back. Anything built on this must be labelled
     honestly; see the stats page. */
  r?: number;
  /* Seeded from the pre-history taste store rather than observed live.
     Kept honest so the stats page can date the start of real records. */
  s?: 1;
};

export type ImportResult = { added: number; skipped: number };

const KEY = "sw-history-v1";
const SEEDED_FLAG = "sw-history-seeded";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Supawatch";

/* Two opens of the same episode inside this window are one sitting, not two
   plays — the player remounts on a reload or a server switch, and React's
   StrictMode double-fires every effect in dev. Keyed on season+episode, so
   moving to the next episode still records: it's a different thing watched. */
const DEDUPE_MS = 30 * 60 * 1000;

function playKey(e: Pick<WatchEvent, "id" | "t" | "sn" | "ep">) {
  return `${e.t}-${e.id}-${e.sn ?? ""}-${e.ep ?? ""}`;
}

/* localStorage is ~5MB. An event serializes to roughly 70–110 bytes, so this
   is around 25–40k plays — far past any real user. Past it we shed the
   *snapshot* fields from the oldest events (recoverable from `id`) instead
   of dropping the events themselves. Losing a poster path is a cosmetic
   regression; losing a play is a lie. */
const SOFT_LIMIT_BYTES = 3_000_000;

type Store = { v: 1; e: WatchEvent[] };

function readStore(): Store | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Store;
    if (parsed?.v !== 1 || !Array.isArray(parsed.e)) return null;
    return { v: 1, e: parsed.e.filter(isEvent).sort((a, b) => a.ts - b.ts) };
  } catch {
    return null;
  }
}

function writeStore(store: Store) {
  try {
    let payload = JSON.stringify(store);

    if (payload.length > SOFT_LIMIT_BYTES) {
      /* Strip snapshots oldest-first until we're back under budget. */
      const stripped = { ...store, e: store.e.map((event) => ({ ...event })) };
      for (const event of stripped.e) {
        if (payload.length <= SOFT_LIMIT_BYTES) break;
        if (event.n === undefined && event.p === undefined) continue;
        delete event.n;
        delete event.p;
        payload = JSON.stringify(stripped);
      }
    }

    localStorage.setItem(KEY, payload);
  } catch {
    /* Quota exceeded or storage blocked — the history simply stops growing
       rather than taking the page down with it. */
  }
}

function isEvent(value: unknown): value is WatchEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<WatchEvent>;
  return (
    typeof e.id === "number" &&
    Number.isFinite(e.id) &&
    (e.t === "movie" || e.t === "tv") &&
    typeof e.ts === "number" &&
    Number.isFinite(e.ts)
  );
}

/** Append one play. Silently no-ops on the server and in blocked storage. */
export function recordWatch(input: Omit<WatchEvent, "ts">, at = Date.now()) {
  if (typeof window === "undefined" || !input?.id) return;

  const store = readStore() ?? { v: 1 as const, e: [] };

  /* Same episode, same sitting — fold it in rather than counting twice. */
  const key = playKey(input);
  for (let i = store.e.length - 1; i >= 0; i--) {
    const prev = store.e[i];
    if (at - prev.ts > DEDUPE_MS) break;
    if (playKey(prev) === key) return;
  }

  store.e.push({ ...input, ts: at });
  writeStore(store);
}

/** Every recorded play, oldest first. Empty when there's no history. */
export function getHistory(): WatchEvent[] {
  if (typeof window === "undefined") return [];
  const store = readStore();
  if (!store) return [];
  return [...store.e].sort((a, b) => a.ts - b.ts);
}

/** A pretty-printed backup. This is the only way history survives a browser. */
export function exportHistory(): string {
  return JSON.stringify(
    { app: APP_NAME, kind: "watch-history", v: 1, exportedAt: Date.now(), events: getHistory() },
    null,
    2,
  );
}

/**
 * Merge a previously exported file back in. Import is additive and
 * idempotent — re-importing the same file changes nothing, so a user can
 * restore a backup over a live history without creating phantom rewatches.
 */
export function importHistory(json: string): ImportResult {
  if (typeof window === "undefined") return { added: 0, skipped: 0 };

  let incoming: unknown;
  try {
    const parsed = JSON.parse(json);
    incoming = Array.isArray(parsed) ? parsed : parsed?.events;
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!Array.isArray(incoming)) {
    throw new Error(`That file doesn't look like a ${APP_NAME} history export.`);
  }

  const store = readStore() ?? { v: 1 as const, e: [] };
  const seen = new Set(store.e.map((event) => `${playKey(event)}-${event.ts}`));

  let added = 0;
  let skipped = 0;
  for (const candidate of incoming) {
    if (!isEvent(candidate)) {
      skipped++;
      continue;
    }
    const key = `${playKey(candidate)}-${candidate.ts}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    store.e.push(candidate);
    added++;
  }

  if (added) writeStore(store);
  return { added, skipped };
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * One-time backfill from the pre-history taste store.
 *
 * That store never kept per-event timestamps — only a running weight, a
 * count, and the last-touched time. Expanding `count` into that many plays
 * would invent a viewing history that never happened, so each surviving
 * record contributes exactly one event, at its `lastTs`, flagged `s: 1`.
 * The stats page reads that flag to date the start of real records.
 */
export function seedFromTaste(
  records: { id: number; media_type: WatchMediaType; title?: string; poster_path?: string | null; genre_ids?: number[]; lastTs: number }[],
) {
  if (typeof window === "undefined") return;

  try {
    if (localStorage.getItem(SEEDED_FLAG)) return;
    localStorage.setItem(SEEDED_FLAG, "1");
  } catch {
    return;
  }

  const store = readStore() ?? { v: 1 as const, e: [] };
  const seen = new Set(store.e.map((event) => `${event.t}-${event.id}`));

  for (const record of records) {
    if (!record?.id || seen.has(`${record.media_type}-${record.id}`)) continue;
    store.e.push({
      id: record.id,
      t: record.media_type,
      ts: record.lastTs,
      g: record.genre_ids?.length ? record.genre_ids : undefined,
      n: record.title,
      p: record.poster_path ?? undefined,
      s: 1,
    });
  }

  writeStore(store);
}
