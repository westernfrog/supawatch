"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { barScale, absoluteScale, type VizDatum } from "@/lib/viz";

/* ── Ranked bars ───────────────────────────────────────────────────────────
   The workhorse. A list of things with a number each, ordered, with a bar
   that makes the gap between first and last something you can see rather
   than something you have to compare digits for.

   Two scales, and picking the wrong one misleads:

     "chart"     — bars relative to this chart's own range. For metrics with
                   no meaningful zero, like ratings, which cluster so tightly
                   that an absolute scale renders every bar identical.
     "absolute"  — bars relative to zero. For counts, where "40 dramas vs 2
                   westerns" is a real 20× gap that must survive.

   `leadingSlot` keeps the primitive honest about layout: TopSix passes a
   poster, /stats passes nothing, and neither needs a variant of this file. */

type Props = {
  data: VizDatum[];
  scale?: "chart" | "absolute";
  /* Fix the absolute scale's ceiling — use when several charts sit side by
     side and must share an axis. */
  max?: number;
  showRank?: boolean;
  valueFormat?: (value: number) => string;
  leadingSlot?: (datum: VizDatum, index: number) => ReactNode;
  armed: boolean;
  emptyLabel?: string;
  className?: string;
};

export default function RankedBars({
  data,
  scale = "absolute",
  max,
  showRank = false,
  valueFormat = (v) => v.toLocaleString("en-US"),
  leadingSlot,
  armed,
  emptyLabel = "Nothing to chart yet.",
  className,
}: Props) {
  if (data.length === 0) {
    return (
      <p className="font-space text-[11px] uppercase tracking-[0.14em] text-neutral-600">
        {emptyLabel}
      </p>
    );
  }

  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const width = scale === "chart" ? barScale(values) : absoluteScale(values, max);

  return (
    <ul data-viz className={cn("flex flex-col", className)}>
      {data.map((datum, index) => {
        const row = (
          <>
            {showRank && (
              <span
                className={cn(
                  "w-7 shrink-0 text-center font-space text-[15px] font-bold tabular-nums leading-none md:w-9 md:text-[18px]",
                  datum.peak ? "text-neutral-300" : "text-neutral-600",
                )}
              >
                {index + 1}
              </span>
            )}

            {leadingSlot?.(datum, index)}

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-4">
                <span className="truncate font-manrope text-[13px] text-white/90 md:text-[14px]">
                  {datum.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-space text-[12px] font-bold tabular-nums md:text-[13px]",
                    datum.value === null
                      ? "text-neutral-600"
                      : datum.peak
                        ? "text-neutral-300"
                        : "text-neutral-400",
                  )}
                  title={datum.value === null ? "No data — the lookup failed" : undefined}
                >
                  {datum.value === null ? "—" : valueFormat(datum.value)}
                </span>
              </span>

              {/* The bar. Track is always painted so an empty row still reads
                  as a row rather than as missing content. */}
              <span className="mt-2 block h-[3px] w-full bg-[var(--viz-0)]">
                <span
                  className={cn(
                    "block h-full transition-[width] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    datum.peak ? "bg-[#e50914]" : "bg-[var(--viz-4)]",
                  )}
                  style={{
                    width: armed && datum.value !== null ? `${width(datum.value)}%` : "0%",
                    transitionDelay: `${index * 70}ms`,
                  }}
                />
              </span>

              {datum.sub && (
                <span className="mt-1.5 block font-space text-[10px] uppercase tracking-[0.12em] text-neutral-600">
                  {datum.sub}
                </span>
              )}
            </span>
          </>
        );

        return (
          <li key={datum.key} className="border-b border-white/[0.06] last:border-b-0">
            {datum.href ? (
              <Link prefetch={false}
                href={datum.href}
                className="group flex items-center gap-4 py-3.5 outline-none transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:ring-white/40 md:gap-5"
              >
                {row}
              </Link>
            ) : (
              <div className="flex items-center gap-4 py-3.5 md:gap-5">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
