"use client";

import { useCallback, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  /* Set false for above-the-fold imagery (heroes) so the browser
     fetches it immediately at high priority. */
  lazy?: boolean;
};

/* Drop-in <img> that de-blurs into view once loaded — the same cinematic
   entrance as the / hero — and lazy-loads by default. */
export default function BlurImage({ lazy = true, className, ...img }: Props) {
  const [loaded, setLoaded] = useState(false);

  /* Callback ref so images served from cache (complete before hydration
     or before onLoad binds) still reveal instead of staying transparent. */
  const refCb = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <img
      {...img}
      ref={refCb}
      loading={lazy ? "lazy" : "eager"}
      fetchPriority={lazy ? undefined : "high"}
      decoding="async"
      onLoad={(e) => {
        setLoaded(true);
        img.onLoad?.(e);
      }}
      className={cn(
        className,
        loaded ? "animate-blur-fade-in" : "opacity-0",
      )}
    />
  );
}
