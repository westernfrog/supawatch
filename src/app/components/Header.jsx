"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Menu,
  Home,
  TrendingUp,
  Star,
  Tv,
  LayoutGrid,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Popular", href: "/popular", icon: TrendingUp },
    { name: "Top Rated", href: "/top-rated", icon: Star },
    { name: "TV Series", href: "/tv", icon: Tv },
    { name: "Genres", href: "/genre", icon: LayoutGrid },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header
      className={`fixed top-0 z-50 inset-x-0 transition-all duration-300 ${
        scrolled
          ? "bg-[#010101] shadow-lg"
          : "bg-linear-to-b from-black/80 via-black/40 to-transparent"
      }`}
    >
      <nav className="flex items-center justify-between lg:px-12 px-4 py-4">
        <div className="flex items-center gap-10">
          <Link href="/" className="shrink-0 group">
            <h1 className="text-2xl text-mdnichrome lg:text-3xl font-black tracking-tight uppercase neon-logo">
              Supawatch
            </h1>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? "text-white font-semibold"
                    : "text-neutral-300 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/search"
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Search className="w-5 h-5" />
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 hover:bg-white/10 rounded-full transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full max-w-xs bg-[#0a0a0a]/98 backdrop-blur-xl border-l border-white/5 p-0"
            >
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b border-white/5">
                  <Link href="/" onClick={() => setOpen(false)}>
                    <h1 className="text-2xl text-mdnichrome font-black tracking-tight uppercase neon-logo">
                      Supawatch
                    </h1>
                  </Link>
                </div>
                <div className="flex-1 px-3 py-4 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200 ${
                          isActive(item.href)
                            ? "bg-white/10 text-white border border-white/20"
                            : "text-neutral-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            isActive(item.href) ? "text-white" : ""
                          }`}
                        />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
                <div className="px-3 pb-8">
                  <Link
                    href="/search"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 px-4 py-3.5 bg-white/5 hover:bg-white/10 rounded-xl text-neutral-300 hover:text-white transition-all duration-200 border border-white/5"
                  >
                    <Search className="w-5 h-5" />
                    <span className="font-medium">Search movies & shows</span>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
