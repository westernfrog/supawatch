"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/* YouTube's embed reports trouble two ways, and a region-blocked trailer can
   pick either: an explicit onError (150/101 = "blocked in your country" or
   embedding disallowed), or a player that simply never starts and paints
   "Video unavailable" inside the frame. We watch for both — the API sends
   these over postMessage once the frame is told to start talking, which needs
   no extra script since the embeds already carry enablejsapi=1. */

const YT_ORIGINS = ["https://www.youtube.com", "https://www.youtube-nocookie.com"];

/* Long enough that a slow start isn't mistaken for a block — an autoplaying
   muted embed that is going to play has always begun well inside this. */
const START_DEADLINE_MS = 8000;

type Message = {
  event?: string;
  info?: { errorCode?: number; playerState?: number } | number;
};

/**
 * Returns true once the hero trailer is known to be unplayable, so the caller
 * can drop back to the backdrop still instead of leaving a dead black frame.
 *
 * @param iframeRef the trailer iframe
 * @param active    whether the trailer is meant to be playing right now
 * @param key       the video id — resets the verdict when the slide changes
 */
export function useTrailerGuard(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  active: boolean,
  key: string | null | undefined,
): boolean {
  /* Verdict is stored against the video it was reached for, so a new key
     starts clean — otherwise one blocked trailer would suppress every later
     one on the same hero. Adjusted during render rather than in an effect,
     which would paint the dead frame for a beat first. */
  const [verdict, setVerdict] = useState<{ key: string | null | undefined; blocked: boolean }>({ key, blocked: false });
  const startedRef = useRef(false);

  if (verdict.key !== key) {
    setVerdict({ key, blocked: false });
    startedRef.current = false;
  }

  const blocked = verdict.key === key && verdict.blocked;
  const setBlocked = () => setVerdict({ key, blocked: true });

  useEffect(() => {
    if (!active || !key) return;

    const frame = iframeRef.current;
    if (!frame) return;

    /* Ask the embed to emit player events. It ignores the request until it
       has loaded, so repeat a few times rather than racing the load. */
    const hello = () =>
      frame.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: key }),
        "*",
      );
    hello();
    const pings = [200, 700, 1500, 3000].map((ms) => setTimeout(hello, ms));

    const onMessage = (e: MessageEvent) => {
      if (!YT_ORIGINS.includes(e.origin)) return;
      let msg: Message;
      try {
        msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object") return;

      const info = typeof msg.info === "object" ? msg.info : undefined;

      if (msg.event === "onError" || typeof info?.errorCode === "number") {
        setBlocked();
        return;
      }
      /* playerState 1 = playing, 3 = buffering — either means we're fine. */
      const state =
        typeof msg.info === "number" ? msg.info : info?.playerState;
      if (state === 1 || state === 3) startedRef.current = true;
    };

    window.addEventListener("message", onMessage);

    /* Nothing ever started: the frame is showing YouTube's own error card. */
    const deadline = setTimeout(() => {
      if (!startedRef.current) setBlocked();
    }, START_DEADLINE_MS);

    return () => {
      window.removeEventListener("message", onMessage);
      pings.forEach(clearTimeout);
      clearTimeout(deadline);
    };
  }, [active, key, iframeRef]);

  return blocked;
}
