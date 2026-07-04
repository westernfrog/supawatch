"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clapperboard, Tv, Flame, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Movies", href: "/movie", icon: Clapperboard },
  { name: "TV", href: "/tv", icon: Tv },
  { name: "Popular", href: "/popular", icon: Flame },
  { name: "Search", href: "/search", icon: Search },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
    >
      {/* Gradient bleed above bar */}
      <div
        aria-hidden
        className="pointer-events-none h-8 bg-gradient-to-t from-[#010101] to-transparent"
      />

      {/* Bar */}
      <div
        className="bg-[#070707]/97 backdrop-blur-2xl"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {/* Top hairline */}
        <div aria-hidden className="h-px bg-white/[0.06]" />

        <div className="flex items-stretch">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1.5 pb-1 pt-3 transition-colors duration-150 active:scale-95",
                  active
                    ? "text-white"
                    : "text-neutral-600 hover:text-neutral-400",
                )}
              >
                {/* Active: white top stripe */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-[2px] bg-white"
                  />
                )}

                <Icon
                  className={cn(
                    "h-[20px] w-[20px] transition-all duration-150",
                    active ? "text-white" : "text-neutral-600",
                  )}
                  strokeWidth={active ? 2.2 : 1.7}
                />

                <span
                  className={cn(
                    "font-manrope text-[8.5px] uppercase tracking-[0.12em] transition-colors duration-150",
                    active ? "text-white" : "text-neutral-700",
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
