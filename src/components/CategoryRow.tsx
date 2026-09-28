"use client";

import { cn } from "@/lib/utils";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import TitleCard from "@/components/discovery/TitleCard";
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
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  const skeletonCount = variant === "top10" ? 10 : variant === "landscape" ? 6 : 8;

  return (
    <div ref={rowRef} className="group/row">
      {/* ── Section header ── */}
      <div className="flex items-end gap-3 px-(--gutter) pb-4">
        {subtitle && (
          <span className="mb-[4px] font-manrope text-[10px] uppercase tracking-[0.24em] text-neutral-600">
            {subtitle}
          </span>
        )}
        <h2
          className="font-manrope font-bold uppercase leading-[1.02] text-white tracking-tight"
          style={{ fontSize: "clamp(1.35rem, 2vw, 1.9rem)" }}
        >
          {title}
        </h2>
        {seeAllHref && (
          <Link prefetch={false}
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
          className="scrollbar-hide flex overflow-x-auto px-(--gutter) py-3"
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

type RowCardProps = { item: Item; index: number; title: string; year: string; onClick: () => void };
function RowCard({ item, onClick, landscape = false, rank }: RowCardProps & { landscape?: boolean; rank?: number }) {
  return <div className="shrink-0 snap-start" style={{ width: landscape ? "clamp(280px, 30vw, 480px)" : "clamp(155px, 16vw, 240px)" }}>
    <TitleCard item={{ ...item, title: itemTitle(item), poster_path: item.poster_path ?? null, media_type: item.media_type || "movie", date: item.release_date || item.first_air_date || "" }} onOpen={onClick} landscape={landscape} rank={rank} />
  </div>;
}
function LandscapeCard(props: RowCardProps) { return <RowCard {...props} landscape />; }
function PortraitCard(props: RowCardProps) { return <RowCard {...props} />; }
function Top10Card(props: RowCardProps & { rank: number }) { return <RowCard {...props} />; }

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
