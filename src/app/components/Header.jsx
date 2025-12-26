"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Menu, X, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Popular", href: "/popular" },
    { name: "Top Rated", href: "/top-rated" },
    { name: "TV Series", href: "/tv" },
    { name: "Genres", href: "/genre" },
  ];

  // Handle scroll effect
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
          <Link href="/" className="shrink-0">
            <h1 className="text-2xl text-mdnichrome lg:text-3xl font-black tracking-tight text-red-600 uppercase animate-flicker">
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
              className="w-full max-w-xs bg-[#141414]/95 backdrop-blur-lg border-l border-white/10"
            >
              <div className="flex flex-col h-full pt-8">
                <div className="flex flex-col gap-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`px-4 py-3 rounded-lg text-lg font-medium transition-colors ${
                        isActive(item.href)
                          ? "bg-white/10 text-white"
                          : "text-neutral-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>

                <Link
                  href="/search"
                  onClick={() => setOpen(false)}
                  className="mt-4 mx-4 flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-neutral-300 hover:text-white transition-colors"
                >
                  <Search className="w-5 h-5" />
                  <span className="font-medium">Search</span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
