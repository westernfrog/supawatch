"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { fetchJson } from "@/lib/client-api";
import { INTRO_SESSION_KEY } from "@/lib/intro";
import styles from "./IntroSplash.module.css";

const WORD = "SUPAWATCH";
const IGNITE_AT_MS = 560;
const MIN_HOLD_MS = 1700;
const MAX_HOLD_MS = 4600;
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const clearPrepaint = () => { delete document.documentElement.dataset.intro; };

/** The marquee, once per session. A flat sign strikes on while the hero's
 * opening frame loads for real; then the power cuts, the letters become
 * windows onto the film, and they open out into the page. */
export default function IntroSplash() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const matteRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<() => void>(() => {});

  useIsomorphicLayoutEffect(() => {
    if (pathname !== "/") {
      clearPrepaint();
      setActive(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return clearPrepaint();
    try {
      if (sessionStorage.getItem(INTRO_SESSION_KEY)) return clearPrepaint();
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch {
      // Storage can be disabled; the intro still works for this document.
    }
    // Session and motion preferences are only available in the browser.
    setActive(true);
  }, [pathname]);

  useIsomorphicLayoutEffect(() => {
    if (!active || pathname !== "/") return;
    const matte = matteRef.current;
    const layer = layerRef.current;
    if (!matte || !layer) return;
    // The overlay is painted now; the pre-paint cover can go.
    clearPrepaint();

    const logo = document.getElementById("brand-logo");
    const word = layer.querySelector<HTMLElement>("[data-word]")!;
    const windows = matte.querySelector<HTMLElement>("[data-windows]")!;
    const details = layer.querySelectorAll("[data-detail]");
    const status = layer.querySelector("[data-status]");
    const chrome = document.querySelectorAll<HTMLElement>("[data-intro-chrome]");
    const page = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== matte && element !== layer &&
        ["HEADER", "MAIN", "FOOTER", "NAV"].includes(element.tagName),
    );
    const previousInert = page.map((element) => element.inert);
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousLogoOpacity = logo?.style.opacity ?? "";
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let exiting = false;
    let unlocked = false;
    let lit = false;
    let loaded = false;
    let readyCall: number | undefined;
    let relightCall: number | undefined;
    let exitTimeline: gsap.core.Timeline | undefined;
    let image: HTMLImageElement | undefined;
    const startedAt = performance.now();

    document.body.style.overflow = "hidden";
    page.forEach((element) => { element.inert = true; });
    if (logo) logo.style.opacity = "0";

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      document.body.style.overflow = previousOverflow;
      page.forEach((element, index) => { element.inert = previousInert[index]; });
      if (layer.contains(document.activeElement) && previousFocus instanceof HTMLElement) {
        previousFocus.focus({ preventScroll: true });
      }
    };
    // The header sign strikes on as the house lights go down, then settles
    // into its usual idle flicker.
    const relightLogo = (strike: boolean) => {
      if (!logo) return;
      logo.style.opacity = previousLogoOpacity;
      logo.classList.remove("neon-gaslight", "neon-relight");
      if (!strike) return logo.classList.add("neon-relight");
      logo.classList.add("neon-ignite");
      relightCall = window.setTimeout(() => {
        logo.classList.remove("neon-ignite");
        logo.classList.add("neon-relight");
      }, 640);
    };
    const finish = () => {
      if (cancelled) return;
      unlock();
      if (logo && !logo.classList.contains("neon-ignite")) relightLogo(false);
      setActive(false);
    };

    const context = gsap.context(() => {
      gsap.set(chrome, { opacity: 0 });
    });

    const exit = () => {
      if (cancelled || exiting) return;
      exiting = true;
      window.clearTimeout(readyCall);
      layer.dataset.exiting = "true";
      // A throttled tab can let the entrance tweens land after these.
      gsap.killTweensOf(details);
      const tl = gsap.timeline({ onComplete: finish });
      exitTimeline = tl;
      tl.to(details, { opacity: 0, duration: 0.2 }, 0);
      // The shutter: the red is sliced into hard bands that thin to nothing,
      // and the film in the windows underneath shows through the gaps until
      // it fills the letters. Same glyphs in both layers, so nothing moves.
      tl.set(windows, { opacity: 1 }, 0);
      tl.fromTo(word, { "--shutter": 1 }, {
        "--shutter": 0, duration: 0.5, ease: "power2.in",
      }, 0);
      tl.set(word, { opacity: 0 }, 0.5);
      // The windows open out from the middle of the word while the black
      // dissolves, so the film arrives rather than being flown into.
      const bounds = windows.getBoundingClientRect();
      tl.set(matte, {
        transformOrigin: `${bounds.left + bounds.width / 2}px ${bounds.top + bounds.height / 2}px`,
      }, 0);
      tl.to(matte, { scale: 10, duration: 1.0, ease: "power3.in" }, 0.65);
      tl.to(matte, { opacity: 0, duration: 0.6, ease: "power1.inOut" }, 1.05);
      // Only animate the hero's image/content wrappers. Keep main free of
      // transforms so fixed players and dialogs retain their viewport anchor.
      context.add(() => {
        const images = document.querySelectorAll("[data-intro-image]");
        const content = document.querySelectorAll("[data-intro-content]");
        if (images.length) tl.fromTo(images,
          { scale: 1.12 },
          { scale: 1, duration: 2.2, ease: "power3.out" }, 0);
        if (content.length) tl.fromTo(content,
          // Individual translate composes with the hero's CSS entrance, which
          // owns opacity (a CSS animation would override an inline one).
          { translate: "0px 32px" },
          { translate: "0px 0px", duration: 0.9, ease: "power3.out" }, 1.3);
      });
      tl.add(() => {
        unlock();
        matte.style.pointerEvents = "none";
        layer.style.pointerEvents = "none";
      }, 1.25);
      tl.add(() => relightLogo(true), 1.5);
      tl.to(chrome, { opacity: 1, duration: 0.4, stagger: 0.05 }, 1.6);
    };

    // Skipping is immediate, including while a reveal is already in flight.
    skipRef.current = finish;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    const onMotionChange = () => { if (motion.matches) finish(); };
    window.addEventListener("keydown", onKey);
    motion.addEventListener("change", onMotionChange);
    const ceiling = window.setTimeout(exit, MAX_HOLD_MS);
    // A background tab may suspend animation frames. Use a wall-clock escape
    // hatch as well so a suspended timeline cannot strand the overlay.
    const deadline = window.setTimeout(finish, MAX_HOLD_MS + 2400);

    const settle = () => {
      if (cancelled || exiting || readyCall !== undefined || !loaded || !lit) return;
      if (status) status.textContent = "Enjoy the show";
      readyCall = window.setTimeout(
        exit,
        Math.max(0, MIN_HOLD_MS - (performance.now() - startedAt)),
      );
    };
    const frameReady = () => {
      if (loaded) return;
      loaded = true;
      settle();
    };
    const igniteCall = window.setTimeout(() => {
      if (cancelled || exiting) return;
      word.dataset.lit = "true";
      lit = true;
      settle();
    }, IGNITE_AT_MS);

    fetchJson<{ results?: { backdrop_path?: string | null }[] }>("/api/getTrending")
      .then((response) => {
        if (cancelled || exiting) return;
        const first = response.results?.[0];
        if (!first?.backdrop_path) return frameReady();
        const wide = window.matchMedia("(min-width: 1024px)").matches;
        image = new Image();
        image.onload = frameReady;
        image.onerror = frameReady;
        image.src = `https://image.tmdb.org/t/p/${wide ? "original" : "w780"}${first.backdrop_path}`;
        image.decode().then(frameReady, () => { if (image?.complete) frameReady(); });
      })
      .catch(frameReady);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      motion.removeEventListener("change", onMotionChange);
      window.clearTimeout(ceiling);
      window.clearTimeout(deadline);
      window.clearTimeout(readyCall);
      window.clearTimeout(igniteCall);
      exitTimeline?.kill();
      context.revert();
      if (image) { image.onload = null; image.onerror = null; }
      unlock();
      clearPrepaint();
      if (logo) {
        window.clearTimeout(relightCall);
        logo.style.opacity = previousLogoOpacity;
        if (logo.classList.contains("neon-ignite")) {
          logo.classList.remove("neon-ignite");
          logo.classList.add("neon-relight");
        }
      }
      skipRef.current = () => {};
    };
  }, [active, pathname]);

  if (!active || pathname !== "/") return null;

  return (
    <>
      {/* The matte: black, with the wordmark cut out of it. Darken turns the
          white letters into windows onto the live page underneath. */}
      <div ref={matteRef} className={styles.matte} aria-hidden="true">
        <div className={styles.stage}>
          <span data-windows className={`${styles.word} ${styles.windows}`}>{WORD}</span>
        </div>
      </div>
      <div ref={layerRef} className={styles.layer} role="dialog" aria-label="Supawatch opening sequence">
        <div className={styles.stage} aria-hidden="true">
          <span data-word className={`${styles.word} ${styles.sign}`}>{WORD}</span>
        </div>
        <p data-status role="status" aria-live="polite" className={styles.srOnly}>
          Setting the scene
        </p>
        <button data-detail type="button" onClick={() => skipRef.current()} className={styles.skip}>
          Skip intro
        </button>
      </div>
    </>
  );
}
