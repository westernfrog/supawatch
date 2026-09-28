"use client";

import { useEffect, useState } from "react";

type Props = { labels: string[]; active: number; durationMs: number; onSelect: (index: number) => void };

// Academy leader: circle + crosshair, with the countdown hand sweeping a wedge.
const SWEEP_R = 3.5;
const SWEEP_C = 2 * Math.PI * SWEEP_R;

function Chevron({ direction }: { direction: "prev" | "next" }) {
  return <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
    <path d={direction === "prev" ? "M8.5 1 1.5 8l7 7" : "M1.5 1 8.5 8l-7 7"} stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
  </svg>;
}

function Leader({ durationMs }: { durationMs: number }) {
  return <svg className="reel-leader" viewBox="0 0 30 20" aria-hidden="true">
    <path d="M0 10h30M15 0v20" stroke="currentColor" strokeOpacity=".3" strokeWidth=".6" />
    <circle cx="15" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity=".7" strokeWidth=".8" />
    <circle className="reel-leader-sweep" cx="15" cy="10" r={SWEEP_R} fill="none" stroke="currentColor" strokeWidth={SWEEP_R * 2} strokeDasharray={SWEEP_C} strokeDashoffset={SWEEP_C} transform="rotate(-90 15 10)" style={{ ["--sweep" as string]: SWEEP_C, animationDuration: `${durationMs}ms` }} />
  </svg>;
}

/** Hero carousel control drawn as a strip of film; the current frame runs the Academy countdown leader. */
export default function HeroSlideIndicator({ labels, active, durationMs, onSelect }: Props) {
  const count = labels.length;
  if (count < 2) return null;
  return (
    <nav aria-label="Featured titles" className="reel-nav">
      <button type="button" className="reel-arrow" onClick={() => onSelect((active - 1 + count) % count)} aria-label="Previous title"><Chevron direction="prev" /></button>
      <div className="reel-strip">
        {labels.map((label, i) => (
          <button key={i} type="button" className="reel-frame" onClick={() => onSelect(i)} aria-label={label} aria-current={i === active}>
            {i === active && <Leader key={active} durationMs={durationMs} />}
          </button>
        ))}
      </div>
      <button type="button" className="reel-arrow" onClick={() => onSelect((active + 1) % count)} aria-label="Next title"><Chevron direction="next" /></button>
    </nav>
  );
}

/**
 * Fight Club's "cigarette burns": the changeover cues flashed in the top-right
 * of the frame before a reel ends. Motor cue ~8s out, changeover cue ~1s out.
 * Place inside the hero section (positioned) and key it to the current slide.
 */
export function ReelCueMark({ durationMs }: { durationMs: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const timers = [durationMs - 8000, durationMs - 1200].filter(at => at > 0).flatMap(at => [
      setTimeout(() => setOn(true), at),
      setTimeout(() => setOn(false), at + 650),
    ]);
    return () => timers.forEach(clearTimeout);
  }, [durationMs]);
  return <span className="reel-cue" data-on={on} aria-hidden="true" />;
}
