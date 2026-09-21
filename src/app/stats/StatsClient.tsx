"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ChartFrame from "@/components/viz/ChartFrame";
import StatTile from "@/components/viz/StatTile";
import RankedBars from "@/components/viz/RankedBars";
import CalendarHeatmap from "@/components/viz/CalendarHeatmap";
import RadialClock from "@/components/viz/RadialClock";
import SplitBar from "@/components/viz/SplitBar";
import { useArmedInView } from "@/lib/useArmedInView";
import { getHistory, exportHistory, importHistory, clearHistory, type WatchEvent } from "@/lib/history";
import { seedHistoryFromTaste } from "@/lib/taste";
import { GENRE_NAMES } from "@/lib/genres";
import { fetchJson } from "@/lib/client-api";
import { formatCount, formatRuntime, type VizDatum } from "@/lib/viz";
import { hourLabel, WEEKDAY_LABELS } from "@/lib/dates";
import * as S from "@/lib/stats";
import { APP_NAME } from "@/lib/app-name";

/* ── Your stats ────────────────────────────────────────────────────────────
   Everything here is computed on this device from this browser's own watch
   log. Nothing is uploaded and nothing is fetched about *you* — the only
   network calls hydrate public TMDB facts about titles you've opened.

   That also means the honest caveats have to be on the page, not buried:
   runtime is what you opened, not what a player measured, and history dies
   with the browser's site data unless it's exported. */

const CHUNK = 40;

/* Language and country names come from the platform rather than a shipped
   table — 200 country names is a lot of bytes for a label. */
const displayName = (kind: "region" | "language") => {
  try {
    return new Intl.DisplayNames(["en"], { type: kind });
  } catch {
    return null;
  }
};

function useFacts(events: WatchEvent[]) {
  const [facts, setFacts] = useState<S.FactsMap>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    const missing = [...new Set(events.map(S.factsKey))].filter(
      (ref) => !requested.current.has(ref),
    );
    if (missing.length === 0) return;
    missing.forEach((ref) => requested.current.add(ref));

    let cancelled = false;
    (async () => {
      for (let i = 0; i < missing.length; i += CHUNK) {
        const batch = missing.slice(i, i + CHUNK);
        try {
          const data = await fetchJson<{ facts: S.TitleFacts[] }>(
            `/api/getTitleFacts?ids=${batch.join(",")}`,
          );
          if (cancelled) return;
          setFacts((prev) => {
            const next = { ...prev };
            for (const fact of data.facts ?? []) next[fact.ref] = fact;
            return next;
          });
        } catch {
          /* A failed batch just leaves those titles thinly described —
             genre counts fall back to the snapshot stored at watch time. */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [events]);

  return facts;
}

export default function StatsClient() {
  const [events, setEvents] = useState<WatchEvent[] | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    /* Deferred off the effect body, as ForYou does — storage reads are the
       one thing standing between mount and first paint here. */
    queueMicrotask(() => {
      seedHistoryFromTaste();
      setEvents(getHistory());
    });
  }, []);

  const facts = useFacts(events ?? []);
  const { ref: armRef, armed } = useArmedInView<HTMLDivElement>("200px 0px");

  const view = useMemo(() => {
    if (!events) return null;
    const t = S.totals(events, facts);
    return {
      totals: t,
      hours: S.byHour(events),
      weekdays: S.byWeekday(events),
      genres: S.byGenre(events, facts),
      decades: S.byDecade(events, facts),
      countries: S.byCountry(events, facts),
      languages: S.byLanguage(events, facts),
      rewatches: S.rewatches(events, facts),
      streak: S.longestStreak(events),
      years: S.activeYears(events),
    };
  }, [events, facts]);

  /* The arming ref has to be mounted from the very first render: useInView
     attaches its observer once and gives up if the element isn't there yet,
     so an early return before this wrapper would leave every chart at
     opacity zero forever. */
  const plays = events ? S.realPlays(events) : [];
  const ready = Boolean(events && view && plays.length > 0);

  const activeYear = year ?? view?.years[0] ?? new Date().getFullYear();
  const regionNames = displayName("region");
  const languageNames = displayName("language");

  const toData = (
    rows: { key: string; count: number }[],
    label: (key: string) => string,
    href?: (key: string) => string,
  ): VizDatum[] =>
    rows.map((row, i) => ({
      key: row.key,
      label: label(row.key),
      value: row.count,
      peak: i === 0,
      href: href?.(row.key),
    }));

  const peakHour = view ? view.hours.indexOf(Math.max(...view.hours)) : 0;

  return (
    <div ref={armRef}>
      {!events && <Loading />}
      {events && !ready && <Empty seeded={events.length > 0} />}
      {ready && view && (
        <>
      {/* ── Headline figures ── */}
      <section className="px-6 pt-10 md:px-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
          <StatTile label="Titles" value={formatCount(view.totals.titles)} sub={`${formatCount(view.totals.plays)} plays`} />
          <StatTile label="Films" value={formatCount(view.totals.movies)} />
          <StatTile label="Episodes" value={formatCount(view.totals.episodes)} />
          <StatTile
            label="Runtime opened"
            value={formatRuntime(view.totals.minutes)}
            sub={
              view.totals.minutesKnownFor < view.totals.plays
                ? `known for ${view.totals.minutesKnownFor} of ${view.totals.plays}`
                : undefined
            }
            peak
          />
        </div>
        <p className="mt-6 max-w-prose font-space text-[10px] uppercase leading-relaxed tracking-[0.1em] text-neutral-600">
          Runtime opened is the length of what you pressed play on, not measured playback — the
          players are third-party and report nothing back. Treat it as an upper bound.
        </p>
      </section>

      {/* ── Calendar ── */}
      <ChartFrame
        title="Watch calendar"
        eyebrow={`${activeYear}`}
        controls={
          view.years.length > 1 ? (
            <div className="flex gap-2">
              {view.years.slice(0, 5).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`font-space text-[11px] uppercase tracking-[0.14em] transition-colors ${
                    y === activeYear ? "text-neutral-300" : "text-neutral-600 hover:text-white"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : undefined
        }
      >
        <CalendarHeatmap
          days={plays.filter((e) => new Date(e.ts).getFullYear() === activeYear).map((e) => ({ ts: e.ts }))}
          year={activeYear}
          armed={armed}
        />
      </ChartFrame>

      {/* ── Rhythm ── */}
      <ChartFrame title="When you watch" eyebrow="Your clock">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:gap-16">
          <RadialClock
            values={view.hours}
            labelAt={(i) => hourLabel(i)}
            labelEvery={6}
            armed={armed}
            segmentLabel={(i, v) => `${hourLabel(i)} — ${v} ${v === 1 ? "play" : "plays"}`}
            centerSlot={
              <div className="text-center">
                <p className="font-space text-[9px] uppercase tracking-[0.16em] text-neutral-600">Peak</p>
                <p className="font-space text-[16px] font-bold tabular-nums text-white">{hourLabel(peakHour)}</p>
              </div>
            }
          />
          <div className="w-full max-w-md flex-1">
            <RankedBars
              data={view.weekdays.map((count, i) => ({
                key: String(i),
                label: WEEKDAY_LABELS[i],
                value: count,
                peak: count === Math.max(...view.weekdays) && count > 0,
              }))}
              armed={armed}
            />
          </div>
        </div>
      </ChartFrame>

      {/* ── Taste ── */}
      <ChartFrame
        title="Your genres"
        eyebrow="Taste"
        note="Counts every title you've opened, including ones you only looked at before this history began."
      >
        <SplitBar
          data={toData(view.genres.slice(0, 10), (k) => GENRE_NAMES[k] ?? `Genre ${k}`)}
          armed={armed}
        />
      </ChartFrame>

      {view.decades.length > 1 && (
        <ChartFrame title="Which era you live in" eyebrow="Decades">
          <RankedBars
            data={view.decades.map((row) => ({
              key: row.key,
              label: `${row.key}s`,
              value: row.count,
              peak: row.count === Math.max(...view.decades.map((d) => d.count)),
              href: `/search?year_from=${row.key}&year_to=${Number(row.key) + 9}`,
            }))}
            armed={armed}
          />
        </ChartFrame>
      )}

      {view.countries.length > 0 && (
        <ChartFrame title="Where it comes from" eyebrow="Origin">
          <RankedBars
            data={toData(view.countries.slice(0, 10), (k) => regionNames?.of(k) ?? k)}
            armed={armed}
          />
        </ChartFrame>
      )}

      {view.languages.length > 1 && (
        <ChartFrame title="Languages" eyebrow="Original audio">
          <SplitBar
            data={toData(view.languages.slice(0, 8), (k) => languageNames?.of(k) ?? k.toUpperCase())}
            armed={armed}
          />
        </ChartFrame>
      )}

      {view.rewatches.length > 0 && (
        <ChartFrame title="Things you came back to" eyebrow="Rewatches">
          <RankedBars
            data={view.rewatches.slice(0, 10).map((r, i) => ({
              key: r.ref,
              label: r.title,
              value: r.plays,
              peak: i === 0,
              href: `/${r.ref.split(":")[0] === "movie" ? "films" : "series"}/${r.ref.split(":")[1]}`,
            }))}
            valueFormat={(v) => `${v}×`}
            armed={armed}
          />
        </ChartFrame>
      )}

      {view.streak && view.streak.length > 1 && (
        <ChartFrame title="Longest streak" eyebrow="Milestones">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
            <StatTile
              label="Consecutive days"
              value={String(view.streak.length)}
              sub={`${new Date(view.streak.from).toLocaleDateString()} – ${new Date(view.streak.to).toLocaleDateString()}`}
              peak
            />
            {view.totals.firstAt && (
              <StatTile
                label="History begins"
                value={new Date(view.totals.firstAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              />
            )}
            <StatTile
              label="Plays per week"
              value={
                view.totals.firstAt && view.totals.lastAt
                  ? (
                      view.totals.plays /
                      Math.max(1, (view.totals.lastAt - view.totals.firstAt) / (7 * 86400000))
                    ).toFixed(1)
                  : "—"
              }
            />
          </div>
        </ChartFrame>
      )}

      {/* ── Your data ── */}
      <ChartFrame
        title="Your history"
        eyebrow="Data"
        note="This history lives only in this browser. Clearing site data deletes it — export if you want to keep it."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => download(exportHistory())} className={BTN}>
            Export
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={BTN}>
            Import
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm("Delete your entire watch history? This can't be undone.")) return;
              clearHistory();
              setEvents([]);
              setNotice("History cleared.");
            }}
            className={`${BTN} !text-neutral-300`}
          >
            Clear
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const result = importHistory(await file.text());
                setEvents(getHistory());
                setNotice(`Imported ${result.added} plays (${result.skipped} already present).`);
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "Import failed.");
              }
            }}
          />
          {notice && (
            <span className="font-space text-[11px] uppercase tracking-[0.12em] text-neutral-400">
              {notice}
            </span>
          )}
        </div>
      </ChartFrame>

      <div className="px-6 pb-20 md:px-12">
        <Link
          href="/charts"
          className="font-space text-[11px] uppercase tracking-[0.16em] text-neutral-500 transition-colors hover:text-white"
        >
          See what everyone else is watching →
        </Link>
      </div>
        </>
      )}
    </div>
  );
}

const BTN =
  "border border-white/15 px-4 py-2 font-space text-[11px] uppercase tracking-[0.14em] text-neutral-300 transition-colors hover:border-white/40 hover:text-white";

function download(json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  const filePrefix = APP_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "watch-history";
  a.download = `${filePrefix}-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function Loading() {
  return (
    <div className="px-6 pt-10 md:px-12">
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border-t border-white/[0.08] pt-3">
            <div className="h-2.5 w-16 animate-pulse bg-white/[0.05]" />
            <div className="mt-3 h-8 w-24 animate-pulse bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ seeded }: { seeded: boolean }) {
  return (
    <div className="px-6 py-16 md:px-12">
      <p className="max-w-prose font-manrope text-[15px] leading-relaxed text-neutral-400">
        Nothing here yet. {APP_NAME} builds this page from what you actually press
        play on — no account, no upload, nothing leaves this browser.{" "}
        {seeded
          ? "We found some titles you'd browsed before, but browsing isn't watching, so they don't count here."
          : "Watch something and it'll start filling in."}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={BTN}>
          Find something to watch
        </Link>
        <Link href="/charts" className={BTN}>
          See the global charts
        </Link>
      </div>
    </div>
  );
}
