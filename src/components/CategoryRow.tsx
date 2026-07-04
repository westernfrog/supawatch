"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import MovieDetailsModal from "./MovieDetailsModal";
import TvDetailsModal from "./TvDetailsModal";
import { fetchJson } from "@/lib/client-api";
import { useInView } from "@/lib/useInView";

export type RowVariant = "landscape" | "portrait" | "top10";

interface Item {
  id: number;
  media_type?: "movie" | "tv";
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  genre_ids?: number[];
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  fetchUrl: string;
  variant?: RowVariant;
  seeAllHref?: string;
  defaultMediaType?: "movie" | "tv";
}

const itemTitle = (i: Item) => i.title ?? i.name ?? "";
const itemDate  = (i: Item) => (i.release_date ?? i.first_air_date ?? "").slice(0, 4);

/* ── useReveal: fires once when the element enters the viewport ── */
function useReveal(index: number) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { queueMicrotask(() => setVisible(true)); return; }

    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(18px) scale(0.96)",
      transition: "opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)",
      /* stagger only during entrance; zero it out after so hover feels instant */
      transitionDelay: visible ? "0ms" : `${(index % 8) * 65}ms`,
    },
  };
}

export default function CategoryRow({
  title, subtitle, fetchUrl, variant = "portrait", seeAllHref, defaultMediaType,
}: Props) {
  const [items, setItems]       = useState<Item[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalItem, setModalItem] = useState<Item | null>(null);
  const scrollRef               = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(true);
  const { ref: rowRef, inView } = useInView();

  useEffect(() => {
    if (!inView) return;
    fetchJson(fetchUrl)
      .then((d) => {
        const raw: Item[] = d.results ?? d.data?.results ?? [];
        const limit = variant === "top10" ? 10 : 20;
        setItems(
          raw
            .filter((i) => (variant === "landscape" ? i.backdrop_path : i.poster_path))
            .slice(0, limit)
            .map((i) => ({ ...i, media_type: i.media_type ?? defaultMediaType ?? "movie" })),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl, inView]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "right" ? el.clientWidth * 0.78 : -el.clientWidth * 0.78,
      behavior: "smooth",
    });
  };

  const skeletonCount = variant === "top10" ? 10 : variant === "landscape" ? 6 : 8;

  return (
    <div ref={rowRef} className="group/row">
      {/* ── Section header ── */}
      <div className="flex items-end gap-3 px-5 pb-4 md:px-8 lg:px-12">
        {subtitle && (
          <span className="mb-[4px] font-manrope text-[10px] uppercase tracking-[0.24em] text-neutral-600">
            {subtitle}
          </span>
        )}
        <h2
          className="font-nichrome font-black uppercase leading-[0.88] text-white tracking-tight"
          style={{ fontSize: "clamp(1.35rem, 2vw, 1.9rem)" }}
        >
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="mb-[3px] font-manrope text-[10px] uppercase tracking-[0.2em] text-neutral-600 transition-colors hover:text-white"
          >
            See all
          </Link>
        )}
      </div>

      {/* ── Scroll area ── */}
      <div className="relative">
        {/* Left fade + arrow */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#010101] via-[#010101]/70 to-transparent transition-opacity duration-300",
            canLeft ? "opacity-100" : "opacity-0",
          )}
        />
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className={cn(
            "absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm",
            "transition-all duration-200 hover:bg-white/20 hover:scale-110 active:scale-95",
            "opacity-0 group-hover/row:opacity-100",
            !canLeft && "pointer-events-none !opacity-0",
          )}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>

        {/* Cards */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="scrollbar-hide flex overflow-x-auto px-5 py-3 md:px-8 lg:px-12"
          style={{
            gap: variant === "top10" ? "0px" : "10px",
            scrollSnapType: "x proximity",
          }}
        >
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <SkeletonCard key={i} variant={variant} />
              ))
            : items.map((item, i) => {
                const props = {
                  item,
                  index: i,
                  title: itemTitle(item),
                  year: itemDate(item),
                  onClick: () => setModalItem(item),
                };
                if (variant === "top10")   return <Top10Card    key={item.id} rank={i + 1} {...props} />;
                if (variant === "landscape") return <LandscapeCard key={item.id} {...props} />;
                return <PortraitCard key={item.id} {...props} />;
              })}
        </div>

        {/* Right fade + arrow */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#010101] via-[#010101]/70 to-transparent transition-opacity duration-300",
            canRight ? "opacity-100" : "opacity-0",
          )}
        />
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className={cn(
            "absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm",
            "transition-all duration-200 hover:bg-white/20 hover:scale-110 active:scale-95",
            "opacity-0 group-hover/row:opacity-100",
            !canRight && "pointer-events-none !opacity-0",
          )}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Modal ── */}
      {modalItem && (
        modalItem.media_type === "tv" ? (
          <TvDetailsModal
            show={{
              id: modalItem.id,
              name: itemTitle(modalItem),
              overview: modalItem.overview ?? "",
              backdrop_path: modalItem.backdrop_path ?? "",
              genre_ids: modalItem.genre_ids ?? [],
              vote_average: modalItem.vote_average ?? 0,
              first_air_date: modalItem.release_date ?? modalItem.first_air_date ?? "",
            }}
            onClose={() => setModalItem(null)}
          />
        ) : (
          <MovieDetailsModal
            movie={{
              id: modalItem.id,
              title: itemTitle(modalItem),
              overview: modalItem.overview ?? "",
              backdrop_path: modalItem.backdrop_path ?? "",
              genre_ids: modalItem.genre_ids ?? [],
              vote_average: modalItem.vote_average ?? 0,
              release_date: modalItem.release_date ?? modalItem.first_air_date ?? "",
            }}
            providers={[]}
            onClose={() => setModalItem(null)}
          />
        )
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   LANDSCAPE card  (16:9 backdrop)
───────────────────────────────────────── */
function LandscapeCard({
  item, index, onClick,
}: { item: Item; index: number; title: string; year: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const { ref, style } = useReveal(index);

  return (
    <div
      ref={ref}
      style={{ ...style, scrollSnapAlign: "start", flexShrink: 0, width: "clamp(340px, 32vw, 520px)" }}
      className="group/card"
    >
      <button
        onClick={onClick}
        className="relative h-full w-full cursor-pointer overflow-hidden bg-neutral-900/40"
        style={{ aspectRatio: "16/9", display: "block" }}
      >
        <img
          src={`https://image.tmdb.org/t/p/w500${item.backdrop_path}`}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-full w-full object-cover",
            /* transition covers opacity + blur (load), scale + brightness (hover) */
            "transition-[transform,opacity,filter] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            "group-hover/card:scale-[1.07] group-hover/card:brightness-[1.07]",
            /* de-focus: dim when another card in the row is hovered */
            "group-hover/row:opacity-60 group-hover/card:!opacity-100",
            loaded ? "opacity-100 blur-0" : "opacity-0 blur-md",
          )}
        />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   PORTRAIT card  (2:3 poster)
───────────────────────────────────────── */
function PortraitCard({
  item, index, onClick,
}: { item: Item; index: number; title: string; year: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const { ref, style } = useReveal(index);

  return (
    <div
      ref={ref}
      style={{ ...style, scrollSnapAlign: "start", flexShrink: 0, width: "clamp(180px, 17vw, 260px)" }}
      className="group/card"
    >
      <button
        onClick={onClick}
        className="block w-full cursor-pointer overflow-hidden bg-neutral-900/40"
        style={{ aspectRatio: "2/3" }}
      >
        <img
          src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-full w-full object-cover",
            "transition-[transform,opacity,filter] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            "group-hover/card:scale-[1.07] group-hover/card:brightness-[1.07]",
            "group-hover/row:opacity-60 group-hover/card:!opacity-100",
            loaded ? "opacity-100 blur-0" : "opacity-0 blur-md",
          )}
        />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   TOP 10 card  (portrait + big rank number)
───────────────────────────────────────── */
function Top10Card({
  item, rank, index, onClick,
}: { item: Item; rank: number; index: number; title: string; year: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const { ref, style } = useReveal(index);

  return (
    <div
      ref={ref}
      style={{ ...style, scrollSnapAlign: "start", flexShrink: 0, width: "clamp(200px, 19vw, 290px)" }}
      className="group/card"
    >
      <button onClick={onClick} className="relative block w-full cursor-pointer text-left">
        {/* Big rank number — behind the poster */}
        <span
          className="pointer-events-none absolute bottom-0 left-0 z-0 select-none font-nichrome font-black leading-[0.82] text-[#141414] transition-[color] duration-300 group-hover/card:text-[#1e1e1e] uppercase tracking-tight"
          style={{ fontSize: "clamp(6rem, 10vw, 10rem)", WebkitTextStroke: "1.5px #262626" }}
        >
          {rank}
        </span>
        {/* Poster shifted right */}
        <div className="relative z-10 ml-[30%] overflow-hidden bg-neutral-900/40" style={{ aspectRatio: "2/3" }}>
          <img
            src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={cn(
              "h-full w-full object-cover",
              "transition-[transform,opacity,filter] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
              "group-hover/card:scale-[1.07] group-hover/card:brightness-[1.07]",
              "group-hover/row:opacity-60 group-hover/card:!opacity-100",
              loaded ? "opacity-100 blur-0" : "opacity-0 blur-md",
            )}
          />
        </div>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   SKELETON card
───────────────────────────────────────── */
function SkeletonCard({ variant }: { variant: RowVariant }) {
  if (variant === "landscape") {
    return (
      <div
        className="shrink-0 animate-pulse bg-white/[0.04]"
        style={{ width: "clamp(340px, 32vw, 520px)", aspectRatio: "16/9" }}
      />
    );
  }
  if (variant === "top10") {
    return (
      <div className="shrink-0" style={{ width: "clamp(200px, 19vw, 290px)" }}>
        <div className="ml-[30%] animate-pulse bg-white/[0.04]" style={{ aspectRatio: "2/3" }} />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 animate-pulse bg-white/[0.04]"
      style={{ width: "clamp(180px, 17vw, 260px)", aspectRatio: "2/3" }}
    />
  );
}
