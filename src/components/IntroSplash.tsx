"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

/* Brand intro — plays once per session on the home route:
   "SUPAWATCH" blooms in centered, runs the neon-gaslight warm-up (via the same
   CSS class the header logo uses), then flies + shrinks to land exactly on the
   header logo. GSAP Flip measures the live logo box, so the handoff is
   pixel-accurate at any breakpoint. Click anywhere to skip. */
export default function IntroSplash() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  /* Decide once: home only, first visit of the session, motion-safe. */
  useEffect(() => {
    if (pathname !== "/" || typeof window === "undefined") return;
    if (sessionStorage.getItem("sw-intro")) return;
    sessionStorage.setItem("sw-intro", "1");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Client-only, session-gated activation — can't be decided during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(true);
  }, [pathname]);

  /* Choreography. */
  useEffect(() => {
    if (!active) return;
    const overlay = overlayRef.current;
    const word = wordRef.current;
    if (!overlay || !word) return;

    document.body.style.overflow = "hidden";
    const end = () => {
      document.body.style.overflow = "";
      setActive(false);
    };

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tlRef.current = tl;

    // 1 · bloom in (immediateRender applies the start state on creation → no flash)
    tl.from(word, { opacity: 0, scale: 0.9, y: 24, filter: "blur(16px)", duration: 0.85 });

    // 2 · hold while the neon tube warms up
    tl.to({}, { duration: 1.0 });

    // 3 · fly + shrink onto the header logo, then pull the curtain
    tl.add(() => {
      const logo = document.getElementById("brand-logo");
      if (!logo) return end();
      Flip.fit(word, logo, { duration: 1.1, ease: "power4.inOut", scale: true, absolute: true });
      gsap.timeline({ onComplete: end })
        .to(overlay, { autoAlpha: 0, duration: 0.65, ease: "power2.inOut" }, 0.55)
        .to(word, { opacity: 0, duration: 0.3, ease: "power1.in" }, 0.9);
    });

    return () => {
      tl.kill();
      gsap.killTweensOf(word);
      gsap.killTweensOf(overlay);
      document.body.style.overflow = "";
    };
  }, [active]);

  if (!active) return null;

  const skip = () => {
    tlRef.current?.kill();
    if (wordRef.current) gsap.killTweensOf(wordRef.current);
    if (overlayRef.current) gsap.killTweensOf(overlayRef.current);
    document.body.style.overflow = "";
    setActive(false);
  };

  return (
    <div
      ref={overlayRef}
      onClick={skip}
      aria-hidden
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#010101]"
    >
      <span
        ref={wordRef}
        className="neon-gaslight select-none font-nichrome font-extrabold uppercase tracking-tight"
        style={{ fontSize: "clamp(2.75rem, 11vw, 8rem)", willChange: "transform, opacity, filter" }}
      >
        Supawatch
      </span>
    </div>
  );
}
