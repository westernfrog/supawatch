"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { fetchJson } from "@/lib/client-api";
import styles from "./IntroSplash.module.css";
import { APP_NAME, APP_NAME_UPPERCASE } from "@/lib/app-name";

const WORD = APP_NAME_UPPERCASE;
const SESSION_KEY = "sw-intro-frame-v1";
const MIN_HOLD_MS = 1600;
const MAX_HOLD_MS = 4200;
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** A film leader, once per session. Preload the hero's actual opening frame,
 * then carry the title into the header. No simulated percentage or countdown. */
export default function IntroSplash() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const skipRef = useRef<() => void>(() => {});

  useIsomorphicLayoutEffect(() => {
    if (pathname !== "/") {
      setActive(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Storage can be disabled; the intro still works for this document.
    }
    // Session and motion preferences are only available in the browser.
    setActive(true);
  }, [pathname]);

  useIsomorphicLayoutEffect(() => {
    if (!active || pathname !== "/") return;
    const root = rootRef.current;
    const word = wordRef.current;
    if (!root || !word) return;

    const logo = document.getElementById("brand-logo");
    const shutters = root.querySelectorAll("[data-shutter]");
    const details = root.querySelectorAll("[data-detail]");
    const frame = root.querySelector("[data-frame]");
    const status = root.querySelector("[data-status]");
    const chrome = document.querySelectorAll<HTMLElement>("[data-intro-chrome]");
    const page = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== root &&
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
    let readyCall: number | undefined;
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
      if (root.contains(document.activeElement) && previousFocus instanceof HTMLElement) {
        previousFocus.focus({ preventScroll: true });
      }
    };
    const finish = () => {
      if (cancelled) return;
      unlock();
      if (logo) {
        logo.style.opacity = previousLogoOpacity;
        logo.classList.remove("neon-gaslight");
        logo.classList.add("neon-relight");
      }
      setActive(false);
    };

    const context = gsap.context(() => {
      gsap.set(chrome, { opacity: 0 });
      gsap.fromTo(frame, { scaleY: 0.02, opacity: 0 }, {
        scaleY: 1, opacity: 1, duration: 0.85, ease: "power3.inOut",
      });
      gsap.fromTo(details, { opacity: 0, y: 8 }, {
        opacity: 1, y: 0, duration: 0.5, delay: 0.3, stagger: 0.06,
      });
      gsap.fromTo(word.querySelectorAll("[data-letter]"), { yPercent: 115 }, {
        yPercent: 0, duration: 0.8, delay: 0.2, stagger: 0.035, ease: "power4.out",
      });
    }, root);

    const exit = () => {
      if (cancelled || exiting) return;
      exiting = true;
      window.clearTimeout(readyCall);
      root.dataset.exiting = "true";
      const tl = gsap.timeline({ onComplete: finish });
      exitTimeline = tl;
      tl.to(details, { opacity: 0, y: -6, duration: 0.2 }, 0);
      // The small screen becomes the real screen; the mattes open from its seam.
      const frameBounds = frame?.getBoundingClientRect();
      if (frameBounds) {
        tl.to(frame, {
          scaleX: window.innerWidth / frameBounds.width,
          scaleY: window.innerHeight / frameBounds.height,
          opacity: 0, duration: 0.85, ease: "power3.inOut",
        }, 0.08);
      }
      tl.to(shutters, { scaleY: 0, duration: 1.05, ease: "power3.inOut" }, 0.16);
      tl.to(word, { color: "#ededed", duration: 0.35 }, 0.12);
      // Only animate the hero's image/content wrappers. Keep main free of
      // transforms so fixed players and dialogs retain their viewport anchor.
      context.add(() => {
        const images = document.querySelectorAll("[data-intro-image]");
        const content = document.querySelectorAll("[data-intro-content]");
        if (images.length) tl.fromTo(images,
          { scale: 1.065, opacity: 0.5 },
          { scale: 1, opacity: 1, duration: 1.2, ease: "power3.out" }, 0.2);
        if (content.length) tl.fromTo(content,
          // Individual translate composes with the hero's CSS entrance.
          { translate: "0px 24px" },
          { translate: "0px 0px", duration: 0.75, ease: "power3.out" }, 0.55);
      });
      if (logo && logo.getBoundingClientRect().width > 0) {
        const from = word.getBoundingClientRect();
        const to = logo.getBoundingClientRect();
        // Keep the title in its existing layout box. Moving it to absolute
        // positioning inside the scaled stage would apply its scale twice.
        gsap.set(word, { transformOrigin: "0 0" });
        tl.to(word, {
          x: to.left - from.left,
          y: to.top - from.top,
          scaleX: to.width / from.width,
          scaleY: to.height / from.height,
          duration: 0.88,
          ease: "power3.inOut",
        }, 0.3);
      }
      tl.add(() => {
        unlock();
        root.style.pointerEvents = "none";
      }, 1.21);
      tl.add(() => {
        if (logo) {
          logo.style.opacity = previousLogoOpacity;
          logo.classList.remove("neon-gaslight");
          logo.classList.add("neon-relight");
        }
        gsap.set(word, { opacity: 0 });
      }, 1.18);
      tl.to(chrome, { opacity: 1, duration: 0.3, stagger: 0.035 }, 1.05);
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
    const deadline = window.setTimeout(finish, MAX_HOLD_MS + 1600);

    const settle = () => {
      if (cancelled || exiting || readyCall !== undefined) return;
      if (status) status.textContent = "Enjoy the show";
      root.dataset.ready = "true";
      readyCall = window.setTimeout(
        exit,
        Math.max(0, MIN_HOLD_MS - (performance.now() - startedAt)),
      );
    };
    fetchJson<{ results?: { backdrop_path?: string | null }[] }>("/api/getTrending")
      .then((response) => {
        if (cancelled || exiting) return;
        const first = response.results?.[0];
        if (!first?.backdrop_path) return settle();
        const wide = window.matchMedia("(min-width: 1024px)").matches;
        image = new Image();
        image.onload = settle;
        image.onerror = settle;
        image.src = `https://image.tmdb.org/t/p/${wide ? "original" : "w780"}${first.backdrop_path}`;
        image.decode().then(settle, () => { if (image?.complete) settle(); });
      })
      .catch(settle);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      motion.removeEventListener("change", onMotionChange);
      window.clearTimeout(ceiling);
      window.clearTimeout(deadline);
      window.clearTimeout(readyCall);
      exitTimeline?.kill();
      context.revert();
      if (image) { image.onload = null; image.onerror = null; }
      unlock();
      if (logo) logo.style.opacity = previousLogoOpacity;
      skipRef.current = () => {};
    };
  }, [active, pathname]);

  if (!active || pathname !== "/") return null;

  return (
    <div ref={rootRef} className={styles.intro} aria-label="${APP_NAME} opening sequence">
      <div data-shutter className={`${styles.shutter} ${styles.shutterTop}`} aria-hidden="true" />
      <div data-shutter className={`${styles.shutter} ${styles.shutterBottom}`} aria-hidden="true" />
      <div className={styles.stage} aria-hidden="true">
        <div data-frame className={styles.frame}>
          <i className={styles.corner} /><i className={styles.corner} />
          <i className={styles.corner} /><i className={styles.corner} />
        </div>
        <span ref={wordRef} className={`${styles.word} intro-word`}>
          {WORD.split("").map((letter, index) => (
            <span className={styles.mask} key={index}>
              <span data-letter>{letter}</span>
            </span>
          ))}
        </span>
      </div>
      <div data-detail className={styles.loading}>
        <div className={styles.transport} aria-hidden="true">
          <div className={styles.film} /><span className={styles.playhead} />
        </div>
        <p data-status role="status" aria-live="polite">Setting the scene</p>
      </div>
      <div data-detail className={styles.bottomline}>
        <button type="button" onClick={() => skipRef.current()} className={styles.skip}>
          Skip intro <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  );
}
