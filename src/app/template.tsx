"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/* Page transition. A template re-mounts its children on every navigation
   (unlike layout, which persists) — so this enter animation plays on each route
   change while the header/footer in layout stay put. Feel: a filmic rise + blur
   settle (content lifts from y+18 as a 9px blur racks into focus). useLayoutEffect
   applies the start state before paint, so there's no flash of the final frame. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        autoAlpha: 0,
        y: 18,
        scale: 1.012,
        filter: "blur(9px)",
        duration: 0.55,
        ease: "power3.out",
        clearProps: "all", // leave no inline transform/filter (keeps fixed/sticky children correct)
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
