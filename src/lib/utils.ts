import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* Type scale for the hero title when TMDB has no logo artwork and the text
   title stands in for it. A display size tuned for "Dune" sprawls across the
   backdrop at "Jimihen!! Jimiko o Kae Chau Jun Isei Kouyuu", so step it down
   as the title grows — the fallback then reads as a designed title card
   rather than an overflow. `desktop` is the full-bleed page hero; `compact`
   is the mobile/modal variant. */
export function heroTitleSize(
  title: string,
  variant: "desktop" | "compact" = "desktop",
): string {
  const n = title.trim().length;
  if (variant === "compact") {
    if (n > 40) return "clamp(1.5rem, 5.5vw, 2.1rem)";
    if (n > 24) return "clamp(1.9rem, 7vw, 2.8rem)";
    return "clamp(2.6rem, 10vw, 4rem)";
  }
  if (n > 40) return "clamp(1.9rem, 2.6vw, 3.1rem)";
  if (n > 24) return "clamp(2.6rem, 3.8vw, 4.6rem)";
  if (n > 14) return "clamp(3.3rem, 5vw, 6.2rem)";
  return "clamp(4rem, 6vw, 8rem)";
}
