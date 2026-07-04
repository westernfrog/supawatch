"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

/**
 * Magnetic scroll snapping for the reels (`.snap-section`).
 *
 * Scrolling stays fully native — momentum, flicks and fast travel all feel
 * normal. The moment the user settles, GSAP gives the nearest reel a soft
 * magnetic pull to the viewport centre. If they start scrolling again mid-pull
 * the tween auto-kills, so it never traps or fights the wheel.
 *
 * Active only on large, pointer-fine viewports and disabled under
 * prefers-reduced-motion; while an overlay locks the page (`body { overflow:
 * hidden }`) the magnet stands down.
 */
export default function ScrollSnap() {
  useEffect(() => {
    gsap.registerPlugin(ScrollToPlugin);

    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        let targets: number[] = [];
        let snapping = false;
        let idle = 0;

        const maxScroll = () =>
          Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

        /* Scroll offsets that park each reel at the viewport centre (tall ones
           rest at their top), plus the very top and bottom. */
        const computeTargets = () => {
          const max = maxScroll();
          const points = new Set<number>([0]);
          gsap.utils.toArray<HTMLElement>(".snap-section").forEach((sec) => {
            const rect = sec.getBoundingClientRect();
            const top = rect.top + window.scrollY;
            const y =
              rect.height <= window.innerHeight
                ? top + rect.height / 2 - window.innerHeight / 2
                : top;
            points.add(Math.round(gsap.utils.clamp(0, max, y)));
          });
          points.add(max);
          targets = Array.from(points).sort((a, b) => a - b);
        };

        const nearest = () => {
          const y = window.scrollY;
          let best = y;
          let dist = Infinity;
          for (const t of targets) {
            const d = Math.abs(t - y);
            if (d < dist) {
              dist = d;
              best = t;
            }
          }
          return best;
        };

        const overlayOpen = () =>
          getComputedStyle(document.body).overflow === "hidden";

        const settle = () => {
          if (snapping || overlayOpen()) return;
          const y = window.scrollY;
          const target = nearest();
          const dist = Math.abs(target - y);
          if (dist < 2) return; // already parked
          if (dist > window.innerHeight * 0.55) return; // out of magnetic range

          snapping = true;
          gsap.to(window, {
            duration: 0.55,
            ease: "power2.out",
            scrollTo: { y: target, autoKill: true },
            onComplete: () => {
              snapping = false;
            },
            onInterrupt: () => {
              snapping = false;
            },
          });
        };

        const onScroll = () => {
          if (snapping) return; // ignore our own programmatic scroll
          window.clearTimeout(idle);
          idle = window.setTimeout(settle, 140);
        };

        computeTargets();

        // Lazy reels / images keep changing the page height — re-measure.
        let raf = 0;
        const ro = new ResizeObserver(() => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(computeTargets);
        });
        ro.observe(document.body);

        window.addEventListener("scroll", onScroll, { passive: true });

        return () => {
          ro.disconnect();
          cancelAnimationFrame(raf);
          window.clearTimeout(idle);
          window.removeEventListener("scroll", onScroll);
          gsap.killTweensOf(window);
        };
      },
    );

    return () => mm.revert();
  }, []);

  return null;
}
