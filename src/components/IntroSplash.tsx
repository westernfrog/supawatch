"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { fetchJson } from "@/lib/client-api";

gsap.registerPlugin(Flip);

/* ─────────────────────────────────────────────────────────────────────────
   Brand intro — plays once per session on the home route.

   One element on black: the wordmark. Nothing else.

     1 · SUPAWATCH rises letter by letter behind a mask
     2 · it holds while the real work finishes off-screen — fetching today's
         lineup and decoding the exact backdrop the hero opens on, so the
         reveal never lands on a skeleton
     3 · the tube strikes red, the wordmark flies onto the header logo and
         swaps with it on a single frame while the black lifts

   Click anywhere or press Esc to skip.
   ───────────────────────────────────────────────────────────────────────── */

const WORD = "SUPAWATCH";

/* Floor so the sequence never feels clipped on a fast connection; ceiling so a
   slow one never traps the visitor behind it. */
const MIN_HOLD_MS = 1750;
const MAX_HOLD_MS = 4200;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function IntroSplash() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const skipRef = useRef<() => void>(() => {});

  /* Decide once: home only, first visit of the session, motion-safe.
     Runs before paint so the overlay is up on the very first frame. */
  useIsomorphicLayoutEffect(() => {
    if (pathname !== "/" || typeof window === "undefined") return;
    if (sessionStorage.getItem("sw-intro")) return;
    sessionStorage.setItem("sw-intro", "1");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Client-only, session-gated activation — can't be decided during render.
    setActive(true);
  }, [pathname]);

  /* ── Choreography ── */
  useIsomorphicLayoutEffect(() => {
    if (!active) return;
    const overlay = overlayRef.current;
    const word = wordRef.current;
    if (!overlay || !word) return;

    const logo = document.getElementById("brand-logo");
    /* The page plays the reveal itself; the header dresses in around the logo
       once it lands. Both are held back now so neither shows through the scrim
       as it thins — a pop-out-then-fade-in would undo the whole hand-off. */
    const main = document.querySelector<HTMLElement>("main");
    const chrome = gsap.utils.toArray<HTMLElement>("[data-intro-chrome]");

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    /* The flying wordmark stands in for the header logo until it lands. */
    if (logo) logo.style.opacity = "0";
    gsap.set(chrome, { opacity: 0 });

    const startedAt = performance.now();
    let dataReady = false;
    let frameReady = false;
    let scheduled = false;
    let finished = false;
    /* Set on teardown — keeps a torn-down instance's in-flight fetch from
       driving the exit of the one that replaced it. */
    let cancelled = false;

    /* ── 1 · wordmark ── */
    const letters = word.querySelectorAll("[data-letter]");
    const intro = gsap.timeline();
    /* fromTo, not from: an effect re-run (StrictMode) would otherwise capture
       the frozen mid-rise position as the tween's destination. */
    intro.fromTo(
      letters,
      { yPercent: 118 },
      { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.04 },
    );
    /* masks have done their job — drop the clipping so a tight line box can't
       shave the glyphs once they've landed */
    intro.set(word.querySelectorAll("[data-mask]"), { overflow: "visible" });

    /* ── 2 · preload the exact frame the hero will open on ──
          Same URL the hero requests, so its <img> paints from cache; the
          shared fetchJson cache means this costs no extra request either. */
    interface Trending {
      backdrop_path?: string | null;
    }
    fetchJson<{ results?: Trending[] }>("/api/getTrending")
      .then((res) => {
        const first = (res.results ?? [])[0];
        dataReady = true;
        if (!first?.backdrop_path) {
          frameReady = true;
          return schedule();
        }
        const wide = window.matchMedia("(min-width: 1024px)").matches;
        const img = new Image();
        img.src = `https://image.tmdb.org/t/p/${wide ? "original" : "w780"}${first.backdrop_path}`;
        const settle = () => {
          if (finished) return;
          frameReady = true;
          schedule();
        };
        (img.decode ? img.decode() : Promise.reject()).then(settle, () => {
          if (img.complete) return settle();
          img.onload = settle;
          img.onerror = settle;
        });
      })
      .catch(() => {
        dataReady = true;
        frameReady = true;
        schedule();
      });

    /* ── 3 · ignition + hand-off ── */
    const run: { exit: gsap.core.Timeline | null } = { exit: null };

    /* Scroll comes back the moment the black is gone — not when the last
       flourish finishes. */
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      document.body.style.overflow = prevOverflow;
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      unlock();
      setActive(false);
    };

    /* The single frame where the flying wordmark becomes the header logo. */
    const handOff = () => {
      if (logo) {
        logo.style.opacity = "";
        logo.classList.remove("neon-gaslight");
        logo.classList.add("neon-relight");
      }
      gsap.set(word, { autoAlpha: 0 });
    };

    /* Beats, in seconds. The mark's flight is the spine: the black thins ahead
       of it, the page settles under it, the header dresses itself once it has
       landed. Nothing waits its turn — the overlaps are what make it read as
       one move instead of four. */
    const exit = (): gsap.core.Timeline => {
      if (run.exit) return run.exit;
      intro.progress(1); /* land the rise rather than freezing it mid-flight */

      /* Stop the scrim eating clicks meant for the page now emerging under it. */
      overlay.style.pointerEvents = "none";

      const tl = gsap.timeline({ onComplete: finish });
      run.exit = tl;

      /* The tube strikes red… */
      tl.add(() => word.classList.add("neon-ignite"), 0);

      /* …the black thins to a haze, so the page is already ghosting through
         before the mark moves — the reveal starts as a dimmer, not a curtain. */
      tl.to(overlay, { opacity: 0.46, duration: 0.5, ease: "power2.out" }, 0.55);

      /* …then the mark flies onto the header logo over the live page. */
      tl.add(() => {
        word.classList.remove("neon-ignite");
        word.classList.add("neon-lit");
        if (!logo) return;
        Flip.fit(word, logo, { duration: 0.92, ease: "power3.inOut", scale: true, absolute: true });
      }, 0.58);

      /* The page rises into focus with the mark rather than sitting there
         finished — the same filmic push-in the hero and route changes use. */
      if (main) {
        tl.fromTo(
          main,
          { scale: 1.05, filter: "blur(8px)", opacity: 0.5, willChange: "transform, filter, opacity" },
          {
            scale: 1,
            filter: "blur(0px)",
            opacity: 1,
            duration: 1.25,
            ease: "power3.out",
            /* leave no inline transform/filter — either would become the
               containing block for the hero's fixed modals */
            clearProps: "all",
          },
          0.58,
        );
      }

      tl.to(overlay, { autoAlpha: 0, duration: 0.76, ease: "power2.inOut" }, 0.98);

      tl.add(handOff, 1.5);

      /* Nav, divider and search settle in around the logo once it's home, so
         the header assembles itself instead of snapping in whole. */
      if (chrome.length) {
        tl.fromTo(
          chrome,
          { opacity: 0, y: -6 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.07, clearProps: "all" },
          1.56,
        );
      }

      /* Black is gone — hand scrolling back before the trailing flourishes. */
      tl.add(unlock, 1.74);
      return tl;
    };

    /* Leave once the frame is ready — but never before the sequence has had
       room to play, and never later than the ceiling. */
    function schedule() {
      if (cancelled || scheduled || !dataReady || !frameReady) return;
      scheduled = true;
      const wait = Math.max(0, MIN_HOLD_MS - (performance.now() - startedAt));
      gsap.delayedCall(wait / 1000, exit);
    }
    const ceiling = gsap.delayedCall(MAX_HOLD_MS / 1000, exit);

    /* Skip — runs the same exit, just faster, so it still resolves onto the
       header logo instead of cutting to a bare page. */
    skipRef.current = () => {
      const rushing = Boolean(run.exit);
      exit().timeScale(rushing ? 3 : 1.9);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipRef.current();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      ceiling.kill();
      intro.kill();
      run.exit?.kill();
      gsap.killTweensOf([word, overlay]);
      document.body.style.overflow = prevOverflow;
      if (logo) logo.style.opacity = "";
      /* A teardown mid-reveal must not strand the page mid-push-in, or leave a
         transform/filter on <main> that reparents the hero's fixed modals. */
      if (main) gsap.set(main, { clearProps: "all" });
      gsap.set(chrome, { clearProps: "all" });
    };
  }, [active]);

  if (!active) return null;

  return (
    <>
      <div
        ref={overlayRef}
        onClick={() => skipRef.current()}
        aria-hidden
        className="fixed inset-0 z-[120] bg-[#010101]"
      />

      {/* Its own layer, so the mark survives the scrim's dissolve and stays
          visible all the way onto the header logo. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[121] flex items-center justify-center"
      >
        <span
          ref={wordRef}
          className="intro-word inline-flex select-none font-extrabold uppercase tracking-tight"
          style={{ fontSize: "clamp(2.75rem, 13vw, 10rem)" }}
        >
          {WORD.split("").map((ch, i) => (
            <span
              key={i}
              data-mask
              className="inline-block overflow-hidden"
              /* 1.0 keeps the mark's box as tight as the header logo's, so the
                 Flip hand-off scales it without squashing */
              style={{ lineHeight: 1 }}
            >
              <span data-letter className="inline-block" style={{ willChange: "transform" }}>
                {ch}
              </span>
            </span>
          ))}
        </span>
      </div>
    </>
  );
}
