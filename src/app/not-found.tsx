import Link from "next/link";
import { Home, Search } from "lucide-react";
import StaticNoise from "@/components/StaticNoise";

export default function NotFound() {
  return (
    <div data-page="404" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#010101] px-6 py-10 text-center">
      {/* TV-static "lost signal" background */}
      <StaticNoise />

      {/* Ghost numeral */}
      <p
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none font-nichrome font-black uppercase text-white/[0.035] tracking-tight"
        style={{ fontSize: "clamp(14rem, 42vw, 32rem)", lineHeight: 1 }}
      >
        404
      </p>

      <div className="relative z-10 flex flex-col items-center">
        <span
          className="font-manrope text-[10px] uppercase tracking-[0.24em] text-neutral-400"
          style={{ textShadow: "0 1px 10px rgba(0,0,0,0.98)" }}
        >
          Error 404
        </span>

        <h1
          className="mt-4 font-nichrome font-black uppercase leading-[0.86] text-white tracking-tight"
          style={{
            fontSize: "clamp(2.75rem, 7vw, 6rem)",
            textShadow: "0 2px 24px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)",
          }}
        >
          Lost Signal
        </h1>

        <p
          className="mt-5 max-w-[46ch] font-manrope text-[15px] font-medium leading-relaxed text-neutral-300 md:text-[16px]"
          style={{ textShadow: "0 1px 14px rgba(0,0,0,0.98), 0 0 3px rgba(0,0,0,0.95)" }}
        >
          The page you&rsquo;re looking for drifted off air. It may have been moved, renamed, or never existed.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-manrope text-[13px] font-bold text-black shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition-transform duration-150 active:scale-95"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/search"
            className="flex items-center gap-2 rounded-full border border-white/[0.22] bg-black/30 px-5 py-2.5 font-manrope text-[13px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/[0.08]"
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
