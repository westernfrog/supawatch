"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Season } from "@/components/TvSeasonsBrowser";
import Link from "next/link";
import BlurImage from "@/components/BlurImage";
import SaveTitleButton from "@/components/discovery/SaveTitleButton";
import { GENRE_NAMES } from "@/lib/genres";
import { normalizeTitle, titleKey, type DiscoveryTitle } from "@/lib/discovery";
import { fetchJson } from "@/lib/client-api";
import { fallbackFeed } from "@/lib/discovery-fallback";
import { useInView } from "@/lib/useInView";
import { useRegionPreference } from "@/lib/useRegionPreference";

type Pill = "blue" | "red";
type Props = { id?: string; kicker?: string; description: string; fetchUrl: string; mediaType: "movie" | "tv"; limit?: number };

const WatchModal = dynamic(() => import("@/components/WatchModal"));
const TvWatchModal = dynamic(() => import("@/components/TvWatchModal"));

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:.=*+-<>";
const poster = (item: DiscoveryTitle | undefined, size: string) => item?.poster_path ? `https://image.tmdb.org/t/p/${size}${item.poster_path}` : undefined;

type Stream = { head: number; speed: number; length: number };
type Column = { glyphs: string[]; streams: Stream[] };
type Layer = { size: number; speed: number; alpha: number; density: number; glow: boolean; resolution: number; columns: Column[]; ramp: string[] };

const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
// Far, in-focus and near layers. Depth-of-field blur is applied per canvas in CSS (one GPU pass), never per glyph,
// and blurred layers render at lower resolution since the blur hides the detail anyway.
const RAIN_LAYERS = [
  { size: 11, speed: 9, alpha: .5, density: .7, glow: false, resolution: 1 },
  { size: 16, speed: 15, alpha: 1, density: .65, glow: true, resolution: 1.5 },
  { size: 30, speed: 24, alpha: .55, density: .12, glow: false, resolution: .5 },
] as const;
const RAMP_STEPS = 24;

/**
 * The film's digital rain: mirrored katakana fixed to a grid, each stream lighting cells as it falls,
 * with a white-hot head, a trail that decays to deep green, and glyphs mutating in place.
 * Runs only while on screen; a single still frame for reduced motion.
 */
function DigitalRain() {
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvases = [...(wrapRef.current?.querySelectorAll("canvas") ?? [])];
    const contexts = canvases.map(canvas => canvas.getContext("2d"));
    if (!canvases.length || contexts.some(context => !context)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Trail colours precomputed per layer: two bright cells behind the head, then a decay to deep green.
    const layers: Layer[] = RAIN_LAYERS.map(layer => ({ ...layer, columns: [], ramp: Array.from({ length: RAMP_STEPS }, (_, step) => `rgba(${step >= RAMP_STEPS - 2 ? "120, 255, 160" : "31, 214, 95"}, ${(layer.alpha * Math.pow((step + 1) / RAMP_STEPS, 1.7) * .92).toFixed(3)})`) }));
    const ratios = layers.map(() => 1);
    let width = 0, height = 0, frame = 0, last = 0, running = false;
    const rowsOf = (layer: Layer) => Math.ceil(height / layer.size) + 1;
    const stream = (layer: Layer, initial: boolean): Stream => {
      const rows = rowsOf(layer);
      return { head: initial ? Math.random() * rows * 1.4 - rows * .4 : -Math.random() * rows * .6, speed: layer.speed * (.55 + Math.random() * .9), length: 8 + Math.floor(Math.random() * 22) };
    };
    const resize = () => {
      width = canvases[0].offsetWidth; height = canvases[0].offsetHeight;
      layers.forEach((layer, index) => {
        ratios[index] = Math.min(window.devicePixelRatio || 1, layer.resolution);
        canvases[index].width = Math.round(width * ratios[index]);
        canvases[index].height = Math.round(height * ratios[index]);
      });
      for (const layer of layers) layer.columns = Array.from({ length: Math.ceil(width / (layer.size * .78)) }, () => ({
        glyphs: Array.from({ length: rowsOf(layer) }, glyph),
        streams: Math.random() < layer.density ? [stream(layer, true), ...(Math.random() < .3 ? [stream(layer, false)] : [])] : [],
      }));
    };
    const draw = (delta: number) => layers.forEach((layer, index) => {
      const context = contexts[index]!;
      const rows = rowsOf(layer);
      const cell = layer.size * .78;
      // Mirror the whole layer once, as the film does, instead of per glyph.
      const ratio = ratios[index];
      context.setTransform(-ratio, 0, 0, ratio, width * ratio, 0);
      context.clearRect(0, 0, width, height);
      context.font = `${layer.size}px "MS Gothic", "Hiragino Kaku Gothic ProN", "Noto Sans JP", monospace`;
      context.textBaseline = "top";
      const heads: [string, number, number][] = [];
      layer.columns.forEach((column, i) => {
        const x = i * cell;
        if (Math.random() < .02 * delta * 60) column.glyphs[Math.floor(Math.random() * rows)] = glyph();
        if (!column.streams.length && Math.random() < layer.density * .004 * delta * 60) column.streams.push(stream(layer, false));
        column.streams = column.streams.filter(item => {
          item.head += item.speed * delta;
          const top = Math.floor(item.head);
          for (let k = 1; k < item.length; k++) {
            const row = top - k;
            if (row < 0 || row >= rows) continue;
            context.fillStyle = k < 3 ? layer.ramp[RAMP_STEPS - 1 - (k - 1)] : layer.ramp[Math.floor((1 - k / item.length) * (RAMP_STEPS - 3))];
            context.fillText(column.glyphs[row], x, row * layer.size);
          }
          if (top >= 0 && top < rows) {
            if (Math.random() < .35) column.glyphs[top] = glyph();
            heads.push([column.glyphs[top], x, top * layer.size]);
          }
          return top - item.length < rows;
        });
      });
      // Leading glyphs last, white-hot, with the only glow in the pass.
      context.fillStyle = `rgba(225, 255, 234, ${layer.alpha})`;
      if (layer.glow) { context.shadowColor = "rgba(140, 255, 175, .9)"; context.shadowBlur = layer.size * .8; }
      for (const [text, x, y] of heads) context.fillText(text, x, y);
      context.shadowBlur = 0;
    });
    const loop = (time: number) => {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      const delta = Math.min((time - last) / 1000, .1);
      if (delta < 1 / 36) return;
      last = time;
      draw(delta);
    };
    const start = () => { if (running || reduced) return; running = true; last = performance.now(); frame = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(frame); };
    resize();
    draw(0);
    const resizer = new ResizeObserver(() => { resize(); draw(0); });
    resizer.observe(canvases[0]);
    const visibility = new IntersectionObserver(([entry]) => entry.isIntersecting ? start() : stop());
    visibility.observe(canvases[0]);
    return () => { stop(); resizer.disconnect(); visibility.disconnect(); };
  }, []);
  return <div ref={wrapRef} className="pill-rain" aria-hidden="true">{RAIN_LAYERS.map((_, index) => <canvas key={index} data-depth={index} />)}</div>;
}

// Positions measured on /images/matrix-morpheus.webp (564x694): sunglass lenses and the two pills.
const LENSES = { red: { left: "43.6%" }, blue: { left: "50.7%" } } as const;
const PILLS = { red: { left: "24.4%", top: "53.9%" }, blue: { left: "75.7%", top: "54.25%" } } as const;

/**
 * Morpheus, offering both pills; each lens of his sunglasses faintly reflects the title on offer,
 * and a thread of light runs from each pill out to the title it stands for.
 */
function Morpheus({ red, blue, glow }: { red?: DiscoveryTitle; blue?: DiscoveryTitle; glow: Pill | null }) {
  return <div className="pill-figure" role="img" aria-label="Morpheus holds out a red pill and a blue pill">
    {(["red", "blue"] as const).map(side => <span key={side} className="pill-thread" data-pill={side} data-lit={glow === side} data-dim={glow !== null && glow !== side} />)}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/images/matrix-morpheus.webp" alt="" width={564} height={694} loading="lazy" decoding="async" />
    {(["red", "blue"] as const).map(side => {
      const item = side === "red" ? red : blue;
      return <span key={side} className="pill-lens" style={LENSES[side]}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {poster(item, "w92") && <img key={item?.id} src={poster(item, "w92")} alt="" />}
      </span>;
    })}
    {(["red", "blue"] as const).map(side => <span key={side} className="pill-glow" data-pill={side} data-lit={glow === side} data-dim={glow !== null && glow !== side} style={PILLS[side]} />)}
  </div>;
}

/** Types the text out one character at a time once `active`, like the film's terminal; all at once for reduced motion. */
function useTyped(text: string, active: boolean) {
  const [frame, setFrame] = useState<{ source: string; count: number } | null>(null);
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      const count = Math.min(text.length, Math.floor((performance.now() - started) / 55));
      setFrame({ source: text, count });
      if (count >= text.length) window.clearInterval(timer);
    }, 55);
    return () => window.clearInterval(timer);
  }, [text, active]);
  if (!active) return "";
  if (frame?.source === text) return text.slice(0, frame.count);
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? text : "";
}

/**
 * Terminal "decode": text resolves from falling-code glyphs into the real characters, left to right.
 * Restarts whenever the text changes; shows the final text immediately for reduced motion.
 */
function useDecoded(text: string, active = true) {
  const [frame, setFrame] = useState<{ source: string; output: string } | null>(null);
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const started = performance.now();
    const duration = Math.min(1100, 260 + text.length * 32);
    const tick = () => {
      const revealed = Math.floor(((performance.now() - started) / duration) * text.length);
      setFrame({ source: text, output: [...text].map((char, i) => i < revealed || char === " " ? char : glyph()).join("") });
      if (revealed >= text.length) window.clearInterval(timer);
    };
    const timer = window.setInterval(tick, 40);
    const first = requestAnimationFrame(tick);
    return () => { window.clearInterval(timer); cancelAnimationFrame(first); };
  }, [text, active]);
  return active && frame?.source === text ? frame.output : text;
}

const OFFER_COPY = { red: { promise: "Down the rabbit hole" }, blue: { promise: "Stay comfortable" } } as const;

/** One side of the choice: the poster alone, lit by its pill, with its copy on the edge facing Morpheus. */
function Offer({ item, pill, opening, onHover, onWatch }: { item: DiscoveryTitle; pill: Pill; opening: boolean; onHover: (pill: Pill | null) => void; onWatch: (item: DiscoveryTitle) => void }) {
  const decoded = useDecoded(item.title);
  const href = `/${item.media_type === "movie" ? "films" : "series"}/${item.id}`;
  const genre = item.genre_ids.map(id => GENRE_NAMES[String(id)]).filter(Boolean).slice(0, 2).join(" / ");
  return <article className="pill-offer" data-pill={pill} onPointerEnter={() => onHover(pill)} onPointerLeave={() => onHover(null)} onFocusCapture={() => onHover(pill)} onBlurCapture={() => onHover(null)}>
    <Link prefetch={false} href={href} transitionTypes={["nav-forward"]} className="pill-offer-poster" aria-label={`Explore ${item.title}`}>
      <BlurImage src={poster(item, "w342")} alt="" width={342} height={513} />
    </Link>
    <div className="pill-offer-copy">
      <p className="sr-only">{OFFER_COPY[pill].promise}</p>
      <h3><Link prefetch={false} href={href} transitionTypes={["nav-forward"]} aria-label={item.title}>{decoded}</Link></h3>
      <p className="pill-offer-meta">
        {item.date && <span>{item.date.slice(0, 4)}</span>}
        {genre && <span>{genre}</span>}
        {item.vote_average > 0 && <span>★ {item.vote_average.toFixed(1)}</span>}
      </p>
    </div>
    <footer className="pill-offer-actions">
      <button type="button" className="pill-watch" onClick={() => onWatch(item)} disabled={opening} aria-label={`Watch ${item.title} now`}><span><Play size={17} fill="currentColor" aria-hidden="true" /></span>{opening ? "Opening…" : "Watch now"}</button>
      <SaveTitleButton item={item} compact />
    </footer>
  </article>;
}

/** "Blue pill or red pill": a Matrix scene offering two titles at a time. */
export default function PillChoice({ id, kicker, description, fetchUrl, mediaType, limit = 12 }: Props) {
  const { ref, inView } = useInView<HTMLElement>("450px 0px");
  const headingId = useId();
  const { region } = useRegionPreference();
  const scoped = new URL(fetchUrl, "https://supawatch.local");
  if (region && scoped.pathname === "/api/getDiscover" && !scoped.searchParams.has("language") && !scoped.searchParams.has("origin_country")) scoped.searchParams.set("origin_country", region);
  const url = scoped.pathname + scoped.search;
  const [result, setResult] = useState<{ url: string; items: DiscoveryTitle[] } | null>(null);
  const [pair, setPair] = useState(0);
  const [glow, setGlow] = useState<Pill | null>(null);

  useEffect(() => {
    if (!inView || region === undefined) return;
    let cancelled = false;
    const fallback = () => fallbackFeed(new URLSearchParams({ format: mediaType, ...(region ? { region } : {}) })).lanes.flatMap(lane => lane.items).filter(item => item.poster_path).slice(0, limit);
    fetchJson<{ results?: Record<string, unknown>[] }>(url).then(data => {
      if (cancelled) return;
      const seen = new Set<string>();
      const items = (data.results ?? []).flatMap(raw => {
        const item = normalizeTitle(raw, mediaType);
        if (!item?.poster_path || seen.has(titleKey(item))) return [];
        seen.add(titleKey(item));
        return [item];
      }).slice(0, limit);
      setResult({ url, items: items.length >= 2 ? items : fallback() });
      setPair(0);
    }).catch(() => { if (!cancelled) { setResult({ url, items: fallback() }); setPair(0); } });
    return () => { cancelled = true; };
  }, [url, inView, region, mediaType, limit]);

  // Blue pill = the crowd favourite, red pill = the least-seen title: pair most-voted with least-voted.
  const items = result?.url === url ? [...result.items].sort((a, b) => b.vote_count - a.vote_count) : [];
  const pairs = Array.from({ length: Math.floor(items.length / 2) }, (_, i) => [items[i], items[items.length - 1 - i]] as const);
  const current = pairs[pair % Math.max(pairs.length, 1)];
  const { ref: seenRef, inView: seen } = useInView<HTMLElement>("0px 0px -35% 0px");
  const typed = useTyped(`> ${kicker ?? "Choose"}`, seen);
  const router = useRouter();
  const [watching, setWatching] = useState<{ item: DiscoveryTitle; seasons: Season[] } | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  // Films open the player straight away; series need their season list first.
  const watch = (item: DiscoveryTitle) => {
    if (item.media_type === "movie") { setWatching({ item, seasons: [] }); return; }
    setOpening(item.id);
    fetchJson<{ data?: { seasons?: Season[] } }>(`/api/getTvDetailsEnhanced?id=${item.id}`)
      .then(res => {
        const seasons = (res.data?.seasons ?? []).filter(season => season.season_number >= 1 && season.episode_count > 0);
        if (seasons.length) setWatching({ item, seasons });
        else router.push(`/series/${item.id}`);
      })
      .catch(() => router.push(`/series/${item.id}`))
      .finally(() => setOpening(null));
  };
  const step = (direction: number) => setPair(value => (value + direction + pairs.length) % pairs.length);


  return <section id={id} ref={ref} className="pill-scene" data-glow={glow ?? undefined} data-seen={seen || undefined} aria-labelledby={headingId}>
    <DigitalRain />
    <div className="pill-world" aria-hidden="true"><i data-pill="red" /><i data-pill="blue" /></div>
    <header ref={seenRef} className="pill-intro">
      <h2 id={headingId} className="sr-only">Red pill or blue pill?</h2>
      <p className="pill-terminal"><span className="sr-only">{kicker}</span><span aria-hidden="true">{typed}<i /></span></p>
      <p className="pill-intro-description">{description}</p>
    </header>
    <div className="pill-stage" aria-busy={!current}>
      {current ? <div key={`red-${pair}`} className="pill-offer-slot pill-offer-slot--red"><Offer item={current[1]} pill="red" opening={opening === current[1].id} onHover={setGlow} onWatch={watch} /></div> : <div className="pill-offer-slot pill-offer-slot--red pill-offer-placeholder" />}
      <div className="pill-center"><Morpheus red={current?.[1]} blue={current?.[0]} glow={glow} /></div>
      {current ? <div key={`blue-${pair}`} className="pill-offer-slot pill-offer-slot--blue"><Offer item={current[0]} pill="blue" opening={opening === current[0].id} onHover={setGlow} onWatch={watch} /></div> : <div className="pill-offer-slot pill-offer-slot--blue pill-offer-placeholder" />}
    </div>
    {pairs.length > 1 && <div className="pill-pager">
      <button type="button" onClick={() => step(-1)} aria-label="Previous pair of titles"><ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" /></button>
      <span aria-hidden="true"><b>{String(pair % pairs.length + 1).padStart(2, "0")}</b> / {String(pairs.length).padStart(2, "0")}</span>
      <span className="pill-pager-ticks" aria-hidden="true">{pairs.map((_, i) => <i key={i} data-active={i === pair % pairs.length} />)}</span>
      <button type="button" onClick={() => step(1)} aria-label="Next pair of titles"><ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" /></button>
    </div>}
    {watching && watching.item.media_type === "movie" && <WatchModal movie={{ id: watching.item.id, title: watching.item.title, backdrop_path: watching.item.backdrop_path ?? "", vote_average: watching.item.vote_average, release_date: watching.item.date }} onClose={() => setWatching(null)} />}
    {watching && watching.item.media_type === "tv" && <TvWatchModal showId={watching.item.id} showName={watching.item.title} backdropPath={watching.item.backdrop_path} logo={null} seasons={watching.seasons} rating={watching.item.vote_average} year={watching.item.date?.slice(0, 4) || null} onClose={() => setWatching(null)} />}
    <p className="sr-only" aria-live="polite">{current ? `Red pill: ${current[1].title}. Blue pill: ${current[0].title}.` : ""}</p>
  </section>;
}
