"use client";

import { useEffect, useRef } from "react";

/* TV white-noise ("snow") background.
   A grayscale noise tile is generated once into an offscreen canvas (via
   ImageData — orders of magnitude faster than per-pixel fillRect), then the
   field is animated by jumping its background-position every frame. Because the
   tile is random, the jumps read as regenerating static rather than a slide.
   A gentle eased mouse parallax adds depth. Honors prefers-reduced-motion by
   freezing to a single noise frame. */
export default function StaticNoise() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;

    // One-time noise tile, capped for encode/perf.
    const w = Math.min(Math.ceil(window.innerWidth), 1366);
    const h = Math.min(Math.ceil(window.innerHeight), 900);
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    const buf = img.data;
    for (let i = 0; i < buf.length; i += 4) {
      const v = (Math.random() * 256) | 0;
      buf[i] = buf[i + 1] = buf[i + 2] = v;
      buf[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    layer.style.backgroundImage = `url(${cv.toDataURL()})`;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      layer.style.transform = "scale(1.1)";
      return;
    }

    let raf = 0;
    let tx = 0, ty = 0; // parallax target
    let cxv = 0, cyv = 0; // eased current
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 20;
      ty = (e.clientY / window.innerHeight - 0.5) * 20;
    };
    window.addEventListener("mousemove", onMove);

    const tick = () => {
      const x = (Math.random() * w) | 0;
      const y = (Math.random() * h) | 0;
      cxv += (tx - cxv) * 0.06;
      cyv += (ty - cyv) * 0.06;
      layer.style.backgroundPosition = `${x}px ${y}px`;
      layer.style.transform = `translate(${cxv}px, ${cyv}px) scale(1.1)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the snow */}
      <div
        ref={ref}
        className="absolute inset-0 opacity-[0.55]"
        style={{ backgroundRepeat: "repeat", willChange: "background-position, transform" }}
      />
      {/* CRT scanlines */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.55) 3px)",
        }}
      />
      {/* vignette — edges only, center stays clear */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(1,1,1,0.45) 78%, rgba(1,1,1,0.88) 100%)",
        }}
      />
    </div>
  );
}
