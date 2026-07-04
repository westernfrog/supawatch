"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Footer() {
  const pathname = usePathname();
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const skyRef = useRef<HTMLDivElement | null>(null);
  const crawlRef = useRef<HTMLDivElement | null>(null);

  /* Page above the footer changes height per route → recompute the trigger. */
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [pathname]);

  useIso(() => {
    const scene = sceneRef.current;
    const sky = skyRef.current;
    const crawl = crawlRef.current;
    if (!scene || !sky || !crawl) return;

    /* Hyper-Realistic Starfield Generation */
    const w = Math.ceil(window.innerWidth);
    const h = Math.ceil(window.innerHeight);
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    if (ctx) {
      // 1. Deep space faint stars (Massive density, tiny, dim)
      const deepCount = Math.round((w * h) / 800); // Extremely dense background field
      for (let i = 0; i < deepCount; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const opacity = Math.random() * 0.25 + 0.05;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(x, y, 1, 1);
      }

      // 2. Mid-distance stars (Less dense, slightly larger, some spectral colors)
      const midCount = Math.round((w * h) / 3000);
      for (let i = 0; i < midCount; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() < 0.6 ? 1 : 1.5;
        const opacity = Math.random() * 0.4 + 0.3;

        // Spectral class colors
        let color = `rgba(255, 255, 255, ${opacity})`;
        const spectral = Math.random();
        if (spectral < 0.1)
          color = `rgba(155, 176, 255, ${opacity})`; // O/B: Blue
        else if (spectral < 0.2)
          color = `rgba(255, 204, 111, ${opacity})`; // K: Orange
        else if (spectral < 0.25) color = `rgba(255, 92, 92, ${opacity})`; // M: Red

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Foreground bright stars with glow and subtle flares
      const brightCount = Math.round((w * h) / 18000);
      for (let i = 0; i < brightCount; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() * 1.5 + 1;
        const opacity = Math.random() * 0.5 + 0.5;

        // Glow Colors
        let r = 255,
          g = 255,
          b = 255;
        const spectral = Math.random();
        if (spectral < 0.2) {
          r = 170;
          g = 190;
          b = 255;
        } else if (spectral < 0.4) {
          r = 255;
          g = 220;
          b = 180;
        } else if (spectral < 0.5) {
          r = 255;
          g = 160;
          b = 160;
        }

        ctx.shadowBlur = Math.random() * 12 + 6;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Lens flares for the very brightest stars
        if (Math.random() < 0.3) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.4})`;
          const flareLen = size * (Math.random() * 5 + 4);
          ctx.fillRect(x - flareLen, y - 0.5, flareLen * 2, 1);
          ctx.fillRect(x - 0.5, y - flareLen, 1, flareLen * 2);
        }
      }

      sky.style.backgroundImage = `url(${cv.toDataURL()})`;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctxGsap = gsap.context(() => {
      gsap.set(crawl, { transformOrigin: "50% 100%", rotationX: 34 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scene,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.6,
        },
      });
      tl.fromTo(crawl, { yPercent: 18 }, { yPercent: -16, ease: "none" }, 0);
      tl.fromTo(sky, { yPercent: 5 }, { yPercent: -7, ease: "none" }, 0);

      // slow ambient drift through space (seamless: one tile height per loop)
      gsap.to(sky, {
        backgroundPositionY: `-=${h}px`,
        duration: 45,
        repeat: -1,
        ease: "none",
      });

      // Death Star superlaser — focal charges green, then the beam fires; loops
      gsap.set(".ds-beam", {
        scaleX: 0,
        opacity: 0,
        rotation: 10,
        yPercent: -50,
        transformOrigin: "right center",
      });
      gsap.set(".ds-focal", { opacity: 0.3, scale: 1 });
      gsap.set(".ds-glow", { opacity: 0 });
      gsap.set(".ds-tributary", { opacity: 0, scaleX: 0 });
      gsap.set(".ds-flash", {
        opacity: 0,
        scale: 0.5,
        xPercent: 50,
        yPercent: -50,
      });

      gsap
        .timeline({
          repeat: -1,
          repeatDelay: 5.5,
          onRepeat: () => {
            // Randomize the firing angle (-5deg to +25deg) on every loop
            const newAngle = Math.floor(Math.random() * 30) - 5;
            gsap.set(".ds-beam", { rotation: newAngle });
          },
        })
        // Charge up phase
        .to(".ds-focal", {
          opacity: 1,
          scale: 2.2,
          duration: 1.5,
          ease: "power2.in",
        })
        .to(".ds-glow", { opacity: 0.8, duration: 1.5, ease: "power2.in" }, "<")
        // Tributary beams flash inwards
        .to(
          ".ds-tributary",
          {
            opacity: 1,
            scaleX: 1,
            duration: 0.4,
            ease: "power2.in",
            stagger: 0.02,
          },
          "-=0.5",
        )
        // Fire main beam!
        .set(".ds-beam", { opacity: 1, scaleX: 0 })
        .to(".ds-beam", { scaleX: 1, duration: 0.1, ease: "power4.out" })
        .to(".ds-glow", { opacity: 1, duration: 0.1 }, "<")
        .set(".ds-tributary", { opacity: 0 }, "<") // Turn off tributaries when main fires
        // Beam energy ripple animation (ripples travel leftwards)
        .to(
          ".ds-beam-ripples",
          { backgroundPositionX: "-100px", duration: 0.6, ease: "none" },
          "<",
        )
        // The massive flash at the emitter
        .to(".ds-flash", { opacity: 1, scale: 1.5, duration: 0.1 }, "<")
        .to(
          ".ds-flash",
          { opacity: 0, scale: 2, duration: 0.4, ease: "power2.out" },
          ">-0.05",
        )
        // Fade out
        .to(
          ".ds-beam",
          { opacity: 0, duration: 0.5, ease: "power1.in" },
          "+=0.1",
        )
        .set(".ds-beam", { scaleX: 0 })
        .to(".ds-focal", { opacity: 0.3, scale: 1, duration: 0.6 }, "<")
        .to(".ds-glow", { opacity: 0, duration: 0.6 }, "<");
    }, scene);

    return () => ctxGsap.revert();
  }, []);

  return (
    <footer className="bg-[#010101] text-white pb-20 md:pb-0">
      {/* ───── Crawl scene — the magic: tagline recedes, wordmark resolves ───── */}
      <div
        ref={sceneRef}
        className="relative overflow-hidden"
        style={{ height: "56vh", minHeight: 380 }}
      >
        {/* starfield (parallax + slow drift) */}
        <div
          ref={skyRef}
          aria-hidden
          className="pointer-events-none absolute inset-[-10%]"
          style={{ willChange: "transform, background-position" }}
        />

        {/* cool nebula drift */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-screen opacity-80"
          style={{
            background:
              "radial-gradient(circle at 80% 30%, rgba(40, 60, 160, 0.2), transparent 45%), radial-gradient(circle at 20% 70%, rgba(130, 40, 90, 0.15), transparent 55%), radial-gradient(circle at 50% 50%, rgba(30, 90, 60, 0.1), transparent 60%)",
            filter: "blur(40px)",
          }}
        />

        {/* Death Star — Highly detailed; charges and fires its superlaser on a loop */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[5%] md:right-[12%] top-[15%] md:top-[22%] z-0"
        >
          <div className="relative h-36 w-36 md:h-48 md:w-48 drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            {/* 1. Base sphere with core shading */}
            <div
              className="absolute inset-0 rounded-full bg-[#41464b]"
              style={{
                boxShadow:
                  "inset 20px 20px 40px rgba(255,255,255,0.25), inset -40px -40px 60px rgba(0,0,0,0.95), inset -10px -10px 20px rgba(0,0,0,0.8)",
              }}
            />

            {/* 2. Macro Paneling (Large structural sectors) */}
            <div
              className="absolute inset-0 rounded-full opacity-30 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(0,0,0,0.4) 16px, rgba(0,0,0,0.4) 17px), " +
                  "repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(0,0,0,0.4) 16px, rgba(0,0,0,0.4) 17px)",
              }}
            />

            {/* 2.5 Micro Paneling (Fine grid) */}
            <div
              className="absolute inset-0 rounded-full opacity-20 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.5) 4px, rgba(0,0,0,0.5) 5px), " +
                  "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.5) 4px, rgba(0,0,0,0.5) 5px)",
                backgroundSize: "10px 10px",
              }}
            />

            {/* 2.7 Surface Craters and Imperfections (Greebling) */}
            <div
              className="absolute inset-0 rounded-full opacity-40 mix-blend-multiply"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 65% 25%, rgba(0,0,0,0.6) 0 2%, transparent 3%)," +
                  "radial-gradient(circle at 80% 45%, rgba(0,0,0,0.5) 0 1.5%, transparent 2.5%)," +
                  "radial-gradient(circle at 45% 85%, rgba(0,0,0,0.7) 0 1%, transparent 2%)," +
                  "radial-gradient(circle at 35% 65%, rgba(0,0,0,0.4) 0 2.5%, transparent 3.5%)," +
                  "radial-gradient(circle at 75% 70%, rgba(0,0,0,0.5) 0 1.5%, transparent 2%)," +
                  "radial-gradient(circle at 25% 45%, rgba(0,0,0,0.3) 0 1%, transparent 1.5%)",
              }}
            />

            {/* 3. Volumetric lighting/shading on top of panels to make it round */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 28% 22%, rgba(255,255,255,0.4) 0%, transparent 40%, rgba(0,0,0,0.9) 75%, #000 100%)",
              }}
            />

            {/* 4. Surface lights (cities/surface installations on the dark side) */}
            <div className="absolute inset-0 rounded-full opacity-90 mix-blend-screen overflow-hidden">
              {/* Dense city clusters */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, #fff 0.5px, transparent 1px)",
                  backgroundSize: "7px 9px",
                  backgroundPosition: "0 0",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, #ffccaa 0.5px, transparent 1px)",
                  backgroundSize: "13px 11px",
                  backgroundPosition: "3px 4px",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, #aaccff 0.5px, transparent 1px)",
                  backgroundSize: "17px 23px",
                  backgroundPosition: "7px 9px",
                }}
              />
              {/* Industrial glowing spots */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, #ff5500 0.5px, transparent 1px)",
                  backgroundSize: "37px 41px",
                  backgroundPosition: "15px 15px",
                }}
              />

              {/* Mask to only show lights on the dark side, fading into the terminator line */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, #000 50%, transparent 80%)",
                  mixBlendMode: "multiply",
                }}
              />
            </div>

            {/* 5. Latitude and Longitude structural lines for 3D illusion */}
            <div className="absolute inset-0 rounded-full border-[2px] border-black/40 overflow-hidden mix-blend-multiply">
              <div className="absolute left-1/2 top-0 bottom-0 w-[140%] -translate-x-1/2 rounded-[100%] border-[1.5px] border-black/40 shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]" />
              <div className="absolute left-1/2 top-0 bottom-0 w-[80%] -translate-x-1/2 rounded-[100%] border-[2px] border-black/50 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]" />
              <div className="absolute left-1/2 top-0 bottom-0 w-[30%] -translate-x-1/2 rounded-[100%] border-[2px] border-black/50" />
              <div className="absolute top-[20%] left-0 right-0 h-[60%] rounded-[100%] border-[2px] border-black/40" />
            </div>

            {/* 5.5 Secondary/Minor trenches */}
            <div className="absolute left-[8%] right-[8%] top-[25%] h-[2px] md:h-[3px] rounded-full bg-black/80 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
            <div className="absolute left-[12%] right-[12%] bottom-[25%] h-[2px] md:h-[3px] rounded-full bg-black/80 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />

            {/* 6. Equatorial trench (deep, glowing slightly, mechanical) */}
            <div
              className="absolute left-0 right-0 top-[50%] h-[6px] md:h-[9px] -translate-y-1/2 rounded-full overflow-hidden flex flex-col justify-center"
              style={{
                background: "#050505",
                boxShadow:
                  "inset 0 4px 6px rgba(0,0,0,1), 0 1px 2px rgba(255,255,255,0.3), 0 -1px 2px rgba(0,0,0,0.8)",
              }}
            >
              {/* internal trench lights */}
              <div
                className="w-full h-[1px] opacity-60"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 2px)",
                }}
              />
              <div
                className="w-full h-[1px] mt-[1px] opacity-80"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, transparent, transparent 1px, #ffaa00 1px, #ffaa00 2px, transparent 2px, transparent 5px)",
                }}
              />
              <div
                className="w-full h-[1px] mt-[1px] opacity-40"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #aaccff, #aaccff 1px, transparent 1px, transparent 8px)",
                }}
              />
            </div>

            {/* 7. Superlaser dish (massively upgraded) */}
            <div
              className="absolute left-[15%] top-[13%] flex h-[38%] w-[38%] items-center justify-center rounded-full overflow-hidden"
              style={{
                background:
                  "radial-gradient(circle at 35% 35%, #4a5056 0%, #2a2e34 40%, #15181c 80%, #050608 100%)",
                boxShadow:
                  "inset 8px 8px 16px rgba(0,0,0,0.9), inset -3px -3px 8px rgba(255,255,255,0.3), 0 0 5px rgba(0,0,0,0.9)",
                transform: "rotate(-12deg)",
              }}
            >
              {/* Complex dish concentric rings */}
              <div className="absolute inset-[10%] rounded-full border border-black/30 shadow-[inset_0_0_12px_rgba(0,0,0,0.5)]" />
              <div className="absolute inset-[22%] rounded-full border-[1.5px] border-black/50 shadow-[inset_0_0_10px_rgba(0,0,0,0.7)]" />
              <div className="absolute inset-[35%] rounded-full border-[2px] border-black/70 shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]" />
              <div className="absolute inset-[50%] rounded-full border-[2px] border-black/90 shadow-[inset_0_0_6px_rgba(0,0,0,0.9)]" />

              {/* Radial focusing array lines */}
              <div
                className="absolute inset-0 opacity-50 mix-blend-multiply"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg, transparent 0deg, transparent 8deg, rgba(0,0,0,0.8) 9deg, transparent 10deg)",
                }}
              />

              {/* Inner glowing green rings when charging */}
              <div
                className="ds-glow absolute inset-[25%] rounded-full border-[1px] border-[#7CFC00] opacity-0"
                style={{ filter: "blur(2px)" }}
              />
              <div
                className="ds-glow absolute inset-[40%] rounded-full border-[2px] border-[#7CFC00] opacity-0"
                style={{ filter: "blur(4px)" }}
              />

              {/* glow ambient layer for the firing sequence */}
              <div
                className="ds-glow absolute inset-0 rounded-full opacity-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(124,252,0,0.6) 0%, transparent 65%)",
                  mixBlendMode: "screen",
                  pointerEvents: "none",
                }}
              />

              {/* Tributary beam array (8 small beams firing into the center) */}
              <div className="absolute inset-0">
                {/* These will fade in right before the main beam fires */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                  <div
                    key={i}
                    className="ds-tributary absolute left-1/2 top-1/2 origin-left"
                    style={{
                      width: "40%",
                      height: "2px",
                      transform: `translate(0, -50%) rotate(${angle}deg)`,
                      background:
                        "linear-gradient(to right, transparent, #a2ff4d 80%, #ffffff 100%)",
                      opacity: 0,
                      boxShadow: "0 0 5px #7CFC00",
                    }}
                  />
                ))}
              </div>

              {/* green emitter — the beam's source */}
              <div
                className="ds-focal relative z-10 h-2.5 w-2.5 md:h-4 md:w-4 rounded-full"
                style={{
                  background: "#c4ff8a",
                  boxShadow:
                    "0 0 15px 4px rgba(124,252,0,1), 0 0 30px 10px rgba(124,252,0,0.6), inset 0 0 5px #fff",
                }}
              >
                {/* central white core */}
                <div className="absolute inset-[2px] bg-white rounded-full blur-[0.5px]" />
              </div>
            </div>

            {/* Massive firing flash at the emitter */}
            <div
              className="ds-flash absolute z-30 flex items-center justify-center rounded-full pointer-events-none mix-blend-screen"
              style={{
                top: "32%",
                right: "67%",
                width: "80px",
                height: "80px",
                background:
                  "radial-gradient(circle at center, #ffffff 0%, #a2ff4d 20%, rgba(124,252,0,0.8) 40%, transparent 70%)",
                boxShadow: "0 0 60px 20px #7CFC00",
                opacity: 0,
              }}
            />

            {/* 8. Superlaser beam — massively upgraded for realism */}
            <div
              className="ds-beam absolute z-20 flex items-center justify-end"
              style={{
                top: "32%",
                right: "67%",
                width: "90vw",
                height: "24px",
                opacity: 0,
                filter:
                  "drop-shadow(0 0 15px #7CFC00) drop-shadow(0 0 40px rgba(124,252,0,0.6))",
              }}
            >
              {/* Outer expanding aura/glow */}
              <div
                className="absolute right-0 w-full h-[18px] rounded-full blur-[4px] opacity-80 mix-blend-screen"
                style={{
                  background:
                    "linear-gradient(to left, #7CFC00 0%, rgba(124,252,0,0.8) 30%, transparent 100%)",
                }}
              />

              {/* Energy ripples traveling down the beam */}
              <div
                className="ds-beam-ripples absolute right-0 w-full h-[12px] rounded-full opacity-90 mix-blend-screen"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, transparent, transparent 15px, #caff99 18px, transparent 20px)",
                  filter: "blur(1.5px)",
                }}
              />

              {/* Inner green intense cylinder */}
              <div className="absolute right-0 w-full h-[6px] bg-[#a2ff4d] rounded-full blur-[1px] opacity-100 mix-blend-screen shadow-[0_0_15px_#fff]" />

              {/* The blinding white core */}
              <div className="absolute right-0 w-full h-[2px] bg-[#ffffff] rounded-full shadow-[0_0_5px_1px_#fff]" />
            </div>

            {/* 9. A subtle atmospheric rim-light/glow on the bright side */}
            <div
              className="absolute inset-0 rounded-full mix-blend-screen pointer-events-none"
              style={{
                boxShadow: "inset 2px 2px 10px rgba(255,255,255,0.4)",
              }}
            />
          </div>
        </div>

        {/* a lone sun — warm beacon in the dark */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[15%] top-[24%] h-2 w-2 rounded-full"
          style={{
            background: "#ffeca6",
            boxShadow:
              "0 0 30px 10px rgba(255,210,140,0.5), 0 0 80px 25px rgba(255,180,90,0.2), 0 0 120px 40px rgba(255,150,50,0.1)",
          }}
        />

        {/* perspective stage */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ perspective: "380px", perspectiveOrigin: "50% 30%" }}
        >
          <div
            ref={crawlRef}
            className="w-[min(90vw,640px)] text-center will-change-transform"
          >
            {/* opening crawl — crawl-yellow, kept small */}
            <p
              className="mx-auto max-w-[34ch] font-manrope font-medium"
              style={{
                fontSize: "clamp(1.1rem, 2.4vw, 1.55rem)",
                lineHeight: 1.5,
                color: "#ffd24a",
                textShadow: "0 0 24px rgba(255,210,74,0.24)",
              }}
            >
              It is a period of endless cinema. Countless movies and series
              drift across the galaxy — seek them out, and find your next great
              watch…
            </p>
            <p
              className="mt-10 font-nichrome font-black uppercase leading-[0.82] select-none pointer-events-none tracking-tight"
              style={{
                fontSize: "clamp(3rem, 11vw, 7.5rem)",
                letterSpacing: "-0.02em",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                WebkitTextStroke: "2px #ffd24a",
                textShadow: "0 0 34px rgba(255,210,74,0.22)",
              }}
            >
              Supawatch
            </p>
          </div>
        </div>

        {/* void at the vanishing point */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[40%]"
          style={{
            background:
              "linear-gradient(to bottom, #010101 8%, rgba(1,1,1,0.5) 46%, transparent)",
          }}
        />
        {/* dissolve down into the utility bar */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{
            background: "linear-gradient(to top, #010101 12%, transparent)",
          }}
        />
      </div>

      {/* ───── Utility bar — full-width ───── */}
      <div className="relative z-10 w-full border-t border-white/[0.06] bg-[#010101]">
        <div className="flex w-full flex-col items-center gap-5 px-6 py-5 md:flex-row md:items-center md:justify-between md:gap-0 md:px-10 lg:px-16">
          {/* Copyright — left */}
          <p className="order-2 shrink-0 text-xs uppercase tracking-widest text-neutral-400 md:order-1">
            © {new Date().getFullYear()}&nbsp;Supawatch
            <span className="mx-2 text-neutral-600">·</span>
            Data by TMDB
          </p>

          {/* Social — right */}
          <div className="order-3 flex items-center gap-1">
            <Link
              href="https://github.com/westernfrog"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="group flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-neutral-400 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white"
            >
              <svg
                className="h-[15px] w-[15px]"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="font-manrope text-[11px] uppercase tracking-[0.12em]">
                GitHub
              </span>
            </Link>
            <Link
              href="https://instagram.com/iam__amansingh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="group flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-neutral-400 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white"
            >
              <svg
                className="h-[15px] w-[15px]"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="font-manrope text-[11px] uppercase tracking-[0.12em]">
                Instagram
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
