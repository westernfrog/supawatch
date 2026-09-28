"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Popcorn, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Films", href: "/films" },
  { name: "Series", href: "/series" },
  { name: "Live TV", href: "/live" },
  { name: "Collections", href: "/collections" },
  { name: "My List", href: "/watchlist" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  const onSearchPage = pathname === "/search";

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      style={{ viewTransitionName: "persistent-nav" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-[66px] transition-all duration-500",
        scrolled
          ? "bg-[#070707]/90 backdrop-blur-2xl"
          : "bg-gradient-to-b from-black/55 to-transparent",
      )}
    >
      <div className="flex h-full items-center px-(--gutter)">
        {/* ── Logo + divider + nav ── */}
        <div className="flex items-center">
          <Link href="/" aria-label="Supawatch" className="shrink-0">
            <span
              id="brand-logo"
              className="neon-gaslight select-none font-nichrome text-[1.45rem] font-extrabold uppercase tracking-tight"
            >
              Supawatch
            </span>
          </Link>

          {/* data-intro-chrome — held back by the brand intro, then settled in
              around the logo once it lands (see IntroSplash). */}
          <div data-intro-chrome className="mx-9 h-4 w-px shrink-0 bg-white/[0.1]" />

          <nav data-intro-chrome className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "font-manrope text-[15px] tracking-[0.01em] transition-colors duration-200",
                    active
                      ? "font-semibold text-white"
                      : "font-medium text-white/45 hover:text-white/75",
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex-1" />

        {/* ── Search ── shaped like a field on wide screens, but it is a link:
            the search page focuses its real input on arrival, so the cursor
            lands where people expect. Just the icon on narrow screens. */}
        {!onSearchPage && (
          <Link
            href="/search"
            aria-label="Search"
            data-intro-chrome
            className="flex min-h-11 min-w-11 items-center justify-center text-white/50 hover:text-white/80"
          >
            <Search className="h-[14px] w-[14px] lg:hidden" />
            <span className="header-search hidden lg:flex">
              <Search className="h-[14px] w-[14px] shrink-0" />
              <span>Find a film, series, or person…</span>
            </span>
          </Link>
        )}

        {/* ── Support ── see .support-link in globals.css. */}
        <a
          href="https://www.buymeacoffee.com/amansinghme"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buy me popcorns (opens in a new tab)"
          data-intro-chrome
          className="ml-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center lg:ml-6"
        >
          <span className="support-link">
            <span className="support-link-mark"><Popcorn className="h-[15px] w-[15px]" /></span>
            <span className="support-link-label">Buy me popcorns</span>
          </span>
        </a>
      </div>
    </header>
  );
}
