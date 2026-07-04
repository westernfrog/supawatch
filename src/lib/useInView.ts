"use client";

import { useEffect, useRef, useState } from "react";

/* One-shot viewport detection. `inView` flips to true once the element comes
   within `rootMargin` of the viewport and never flips back — sections use it
   to defer their data fetch until the user is about to reach them. */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  rootMargin = "700px 0px",
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setInView(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}
