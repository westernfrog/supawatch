"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Menu, Home, TrendingUp, Star, Tv, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENRES, getGenreName } from "@/lib/genres";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Popular", href: "/popular", icon: TrendingUp },
  { name: "Top Rated", href: "/top-rated", icon: Star },
  { name: "TV Series", href: "/tv", icon: Tv },
];

function GenreSelect({
  value,
  onValueChange,
  active,
  triggerClassName,
  contentAlign = "start",
  size = "sm",
  variant = "nav",
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label="Browse genres"
        size={size}
        className={cn(
          variant === "nav"
            ? [
                "h-auto min-w-0 gap-1 border-0 bg-transparent p-0 shadow-none ring-0 focus-visible:ring-0 focus-visible:border-0",
                "text-sm font-medium text-neutral-300 transition-colors duration-200 hover:text-white",
                "[&>svg.lucide-chevron-down]:hidden",
                active && "text-white font-semibold",
              ]
            : [
                "min-w-[11rem] border-white/10 bg-white/5 text-neutral-200 shadow-none backdrop-blur-sm transition-colors hover:bg-white/10 focus-visible:border-white/20 focus-visible:ring-white/15",
                active && "border-white/20 bg-white/10 text-white",
              ],
          triggerClassName
        )}
      >
        <span className="flex items-center gap-1">
          Genres
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </span>
      </SelectTrigger>
      <SelectContent
        align={contentAlign}
        position="popper"
        className="border-white/10 bg-[#0a0a0a]/98 text-white backdrop-blur-xl"
      >
        <SelectGroup>
          <SelectLabel className="px-2 text-[11px] uppercase tracking-[0.24em] text-neutral-500">
            Browse Genres
          </SelectLabel>
          {GENRES.map(({ id, name }) => (
            <SelectItem
              key={id}
              value={String(id)}
              className="text-neutral-200 focus:bg-white/10 focus:text-white"
            >
              {name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const activeGenreId = pathname.match(/^\/genre\/(\d+)(?:\/)?$/)?.[1];
  const isGenreRoute = pathname.startsWith("/genre");
  const activeGenreName = activeGenreId ? getGenreName(activeGenreId) : null;
  const selectedGenreValue = activeGenreName ? activeGenreId : undefined;

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

  const handleGenreChange = (genreId) => {
    router.push(`/genre/${genreId}`);
    setOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 z-50 inset-x-0 transition-all duration-300",
        scrolled
          ? "bg-[#010101] shadow-lg"
          : "bg-linear-to-b from-black/80 via-black/40 to-transparent"
      )}
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
                className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  isActive(item.href)
                    ? "text-white font-semibold"
                    : "text-neutral-300 hover:text-white"
                )}
              >
                {item.name}
              </Link>
            ))}
            <GenreSelect
              value={selectedGenreValue}
              onValueChange={handleGenreChange}
              active={isGenreRoute}
              variant="nav"
            />
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
              <button
                type="button"
                className="lg:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full max-w-xs bg-[#0a0a0a]/98 backdrop-blur-xl border-l border-white/5 p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b border-white/5">
                  <Link href="/" onClick={() => setOpen(false)}>
                    <h1 className="text-2xl text-mdnichrome font-black tracking-tight uppercase neon-logo">
                      Supawatch
                    </h1>
                  </Link>
                </div>
                <div className="flex flex-1 flex-col gap-1 px-3 py-4">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200",
                          isActive(item.href)
                            ? "bg-white/10 text-white border border-white/20"
                            : "text-neutral-400 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon
                          className={cn("w-5 h-5", isActive(item.href) && "text-white")}
                        />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                  <div className="px-4 pt-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-neutral-500">
                      Genre
                    </p>
                    <GenreSelect
                      value={selectedGenreValue}
                      onValueChange={handleGenreChange}
                      active={isGenreRoute}
                      contentAlign="end"
                      size="default"
                      variant="sheet"
                      triggerClassName="h-12 w-full rounded-xl border-white/5 bg-white/5 px-4 text-base"
                    />
                    {activeGenreName && (
                      <p className="mt-3 text-sm text-neutral-500">
                        Currently browsing {activeGenreName}
                      </p>
                    )}
                  </div>
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
