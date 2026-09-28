"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { VIZ_STEPS } from "@/lib/viz";

/* ── Tag cloud ─────────────────────────────────────────────────────────────
   The one primitive that isn't SVG, deliberately: tags have to wrap, be
   selectable, and be links, and SVG text layout fights all three.

   Size scales with the square root of weight, so the *area* of a word tracks
   its value rather than its height — otherwise the biggest tag looks several
   times more dominant than it is. Shade tracks the same value, so the two
   channels agree and neither has to be decoded alone.

   No pills. A pill needs a rounded corner. */

type Tag = { id: string | number; name: string; weight: number; href?: string };

type Props = {
  tags: Tag[];
  sizes?: [number, number];
  maxTags?: number;
  armed: boolean;
  className?: string;
};

export default function TagCloud({
  tags,
  sizes = [11, 30],
  maxTags = 40,
  armed,
  className,
}: Props) {
  const shown = [...tags].sort((a, b) => b.weight - a.weight).slice(0, maxTags);
  if (shown.length === 0) return null;

  const weights = shown.map((t) => t.weight);
  const lo = Math.min(...weights);
  const hi = Math.max(...weights);
  const [minSize, maxSize] = sizes;

  const scale = (weight: number) => {
    if (hi <= lo) return (minSize + maxSize) / 2;
    const t = Math.sqrt((weight - lo) / (hi - lo));
    return minSize + t * (maxSize - minSize);
  };

  const shade = (weight: number) => {
    if (hi <= lo) return VIZ_STEPS[5];
    const t = (weight - lo) / (hi - lo);
    return VIZ_STEPS[Math.max(2, Math.round(2 + t * 4))];
  };

  return (
    <div data-viz className={cn("flex flex-wrap items-baseline gap-x-5 gap-y-2.5", className)}>
      {shown.map((tag, i) => {
        const style = {
          fontSize: `${scale(tag.weight)}px`,
          color: shade(tag.weight),
          opacity: armed ? 1 : 0,
          transform: armed ? "none" : "translateY(4px)",
          transition: "opacity 420ms ease-out, transform 420ms ease-out",
          transitionDelay: `${i * 18}ms`,
        };

        const content = (
          <span className="font-space uppercase tracking-[0.06em]" style={style}>
            {tag.name}
          </span>
        );

        return tag.href ? (
          <Link prefetch={false}
            key={tag.id}
            href={tag.href}
            className="outline-none transition-colors hover:!text-white focus-visible:ring-1 focus-visible:ring-white/40"
            title={`${tag.name} — ${tag.weight}`}
          >
            {content}
          </Link>
        ) : (
          <span key={tag.id} title={`${tag.name} — ${tag.weight}`}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
