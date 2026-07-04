"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MediaGrid from "@/components/MediaGrid";
import ShowReel from "@/components/ShowReel";
import BlurImage from "@/components/BlurImage";
import { getTasteProfile, type TasteProfile } from "@/lib/taste";
import { GENRE_NAMES } from "@/lib/genres";

/* ── For You ───────────────────────────────────────────────────────────────
   Personalized home rows driven by the on-device taste profile:

     · Jump Back In          — titles the user recently touched
     · More Like {anchor}    — TMDB recommendations seeded by their
                               strongest recent titles (rotates per visit)
     · Your Kind of {genre}  — discover query built from their top genre

   Everything reads localStorage after mount, so first-time visitors (and
   the server-rendered HTML) simply see nothing here — zero cost until
   there's a profile worth acting on. */

export default function ForYou() {
  const [profile, setProfile] = useState<TasteProfile | null>(null);

  useEffect(() => {
    queueMicrotask(() => setProfile(getTasteProfile()));
  }, []);

  if (!profile) return null;

  const { anchors, topGenres, leanType, recent, seenIds } = profile;
  const topGenre = topGenres[0];
  const topGenreName = topGenre ? GENRE_NAMES[String(topGenre)] : null;

  return (
    <>
      {recent.length >= 3 && <JumpBackIn items={recent} />}

      {anchors.map((anchor) => (
        <ShowReel
          key={`anchor-${anchor.media_type}-${anchor.id}`}
          title={`More Like ${anchor.title}`}
          subtitle="Because You Watched"
          fetchUrl={
            anchor.media_type === "tv"
              ? `/api/getTvRecommendations?id=${anchor.id}`
              : `/api/getMovieRecommendations?id=${anchor.id}`
          }
          mediaType={anchor.media_type}
          excludeIds={seenIds}
        />
      ))}

      {topGenreName && (
        <MediaGrid
          title={`Your Kind of ${topGenreName}`}
          subtitle="Made For You"
          fetchUrl={`/api/getDiscover?type=${leanType}&with_genres=${topGenre}&sort_by=popularity.desc&vote_count_gte=200`}
          excludeIds={seenIds}
        />
      )}
    </>
  );
}

/* Recently-touched titles, straight from localStorage — no network. */
function JumpBackIn({ items }: { items: TasteProfile["recent"] }) {
  return (
    <div className="snap-section pt-16 pb-12 lg:pt-24 lg:pb-16">
      <div className="mb-6 px-5 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4">
          <div className="h-9 w-1 shrink-0 bg-[#e50914]" />
          <div className="flex flex-col justify-center gap-0.5">
            <span className="font-space text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">
              Your History
            </span>
            <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
              Jump Back In
            </h2>
          </div>
        </div>
      </div>

      <div className="px-5 md:px-8 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scrollbar-hide md:gap-4">
            {items.map((item) => (
              <Link
                key={`${item.media_type}-${item.id}`}
                href={`/${item.media_type}/${item.id}`}
                className="group w-[130px] shrink-0 snap-start md:w-[150px] lg:w-[170px]"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
                  {item.poster_path ? (
                    <BlurImage
                      src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                  ) : item.backdrop_path ? (
                    <BlurImage
                      src={`https://image.tmdb.org/t/p/w300${item.backdrop_path}`}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-manrope text-[11px] text-neutral-600">
                      {item.title[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <p className="mt-2 truncate font-manrope text-[12.5px] text-neutral-400 transition-colors group-hover:text-white">
                  {item.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
