"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Movies", href: "/movie" },
  { name: "TV", href: "/tv" },
  { name: "Live TV", href: "/live" },
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
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-[66px] transition-all duration-500",
        scrolled
          ? "bg-[#070707]/90 backdrop-blur-2xl"
          : "bg-gradient-to-b from-black/55 to-transparent",
      )}
    >
      <div className="flex h-full items-center px-12">
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

          <div className="mx-9 h-4 w-px shrink-0 bg-white/[0.1]" />

          <nav className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
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

        {/* ── Search ── */}
        {!onSearchPage && (
          <Link
            href="/search"
            aria-label="Search"
            className="flex items-center gap-1.5 text-white/40 transition-colors duration-200 hover:text-white/70"
          >
            <Search className="h-[14px] w-[14px]" />
            <span className="hidden font-manrope text-[15px] font-medium tracking-[0.01em] lg:inline">
              Search
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
