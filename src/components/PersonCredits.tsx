"use client";

import { useState } from "react";
import MovieDetailsModal from "@/components/MovieDetailsModal";
import TvDetailsModal from "@/components/TvDetailsModal";
import BlurImage from "@/components/BlurImage";

interface Credit {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genre_ids: number[];
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  character?: string;
  job?: string;
  popularity: number;
  credit_id: string;
}

const creditTitle = (m: Credit) => m.title ?? m.name ?? "";
const creditDate = (m: Credit) => m.release_date ?? m.first_air_date ?? "";
const creditRole = (m: Credit) => m.character || m.job || "";

interface Props {
  knownFor: Credit[];
  filmography: Credit[];
}

export default function PersonCredits({ knownFor, filmography }: Props) {
  const [selected, setSelected] = useState<Credit | null>(null);

  return (
    <>
      {/* ── KNOWN FOR ── ShowReel-style */}
      {knownFor.length > 0 && (
        <section className="py-12 lg:py-16">
          {/* Header — matches ShowReel */}
          <div className="mb-6 px-5 md:px-8 lg:px-12">
            <div className="mx-auto flex max-w-[1400px] items-center gap-4">
              <div className="h-9 w-1 shrink-0 bg-[#e50914]" />
              <div className="flex flex-col justify-center gap-0.5">
                <span className="font-space text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">
                  Selected Works
                </span>
                <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
                  Known For
                </h2>
              </div>
            </div>
          </div>

          {/* Reel — matches ShowReel scroll container */}
          <div className="px-5 md:px-8 lg:px-12">
            <div className="mx-auto max-w-[1400px]">
              <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-hide md:gap-5 lg:gap-6">
                {knownFor.map((m) => (
                  <KnownForCard
                    key={`kf-${m.credit_id}`}
                    credit={m}
                    onClick={() => setSelected(m)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FILMOGRAPHY ── */}
      {filmography.length > 0 && (
        <section className="px-6 py-14 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-[1400px]">
            {/* Header + tabs */}
            <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-9 w-1 shrink-0 bg-[#e50914]" />
                <div className="flex flex-col justify-center gap-0.5">
                  <span className="font-space text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">
                    Complete Works
                  </span>
                  <h2 className="font-manrope text-[20px] font-semibold leading-none tracking-tight text-white/95">
                    Filmography
                    <span className="ml-2 font-space text-[14px] font-medium text-neutral-600">
                      ({filmography.length})
                    </span>
                  </h2>
                </div>
              </div>
            </div>

            {/* List */}
            <FilmographyList credits={filmography} onSelect={setSelected} />
          </div>
        </section>
      )}

      {/* ── Modals ── */}
      {selected?.media_type === "movie" && (
        <MovieDetailsModal
          movie={{
            id: selected.id,
            title: creditTitle(selected),
            overview: selected.overview,
            backdrop_path: selected.backdrop_path ?? "",
            genre_ids: selected.genre_ids,
            vote_average: selected.vote_average,
            release_date: selected.release_date ?? "",
          }}
          providers={[]}
          onClose={() => setSelected(null)}
        />
      )}
      {selected?.media_type === "tv" && (
        <TvDetailsModal
          show={{
            id: selected.id,
            name: creditTitle(selected),
            overview: selected.overview,
            backdrop_path: selected.backdrop_path ?? "",
            genre_ids: selected.genre_ids,
            vote_average: selected.vote_average,
            first_air_date: selected.first_air_date ?? "",
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function KnownForCard({
  credit,
  onClick,
}: {
  credit: Credit;
  onClick: () => void;
}) {
  const year = creditDate(credit).slice(0, 4);
  const role = creditRole(credit);

  return (
    <button
      onClick={onClick}
      className="group flex w-[400px] shrink-0 snap-start flex-col gap-0 text-left sm:w-[500px] md:w-[580px] lg:w-[660px]"
    >
      {/* Thumbnail — landscape backdrop, fallback to poster letterboxed */}
      <div className="relative aspect-video w-full overflow-hidden border border-white/[0.06] bg-neutral-900">
        {credit.backdrop_path ? (
          <BlurImage
            src={`https://image.tmdb.org/t/p/w780${credit.backdrop_path}`}
            alt={creditTitle(credit)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : credit.poster_path ? (
          <BlurImage
            src={`https://image.tmdb.org/t/p/w342${credit.poster_path}`}
            alt={creditTitle(credit)}
            className="mx-auto h-full object-contain transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-nichrome text-5xl text-neutral-700 uppercase tracking-tight">
            {creditTitle(credit)[0]}
          </div>
        )}
      </div>

      {/* Below-card info — matches ShowReel */}
      <div className="flex flex-col gap-2 pt-5">
        {/* Meta strip: year · Movie/Series */}
        <div className="flex items-center gap-2">
          {year && (
            <span className="font-space text-[12px] tracking-widest text-white/30">
              {year}
            </span>
          )}
          <span className="text-white/15">·</span>
          <span className="font-manrope text-[12px] text-white/30">
            {credit.media_type === "tv" ? "Series" : "Movie"}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-manrope text-[19px] font-medium leading-snug text-white/80 line-clamp-1 transition-colors group-hover:text-white md:text-[20px]">
          {creditTitle(credit)}
        </h3>

        {/* Role */}
        {role && (
          <p className="font-manrope text-[13px] text-neutral-500">
            {credit.character ? `as ${credit.character}` : credit.job}
          </p>
        )}
      </div>
    </button>
  );
}

function FilmographyList({
  credits,
  onSelect,
}: {
  credits: Credit[];
  onSelect: (c: Credit) => void;
}) {
  return (
    <div className="flex flex-col">
      {credits.map((m) => {
        const year = creditDate(m).slice(0, 4) || "—";
        const role = creditRole(m);
        return (
          <button
            key={`fm-${m.credit_id}`}
            onClick={() => onSelect(m)}
            className="group flex w-full items-center gap-4 sm:gap-6 border-b border-white/[0.05] py-3 sm:py-4 px-3 sm:px-6 text-left transition-colors duration-200 hover:bg-white/[0.02] hover:border-white/[0.08]"
          >
            {/* Year */}
            <div className="w-10 sm:w-16 shrink-0">
              <span className="font-space text-[13px] sm:text-[16px] font-bold tabular-nums text-white/40 transition-colors duration-200 group-hover:text-white">
                {year}
              </span>
            </div>

            {/* Thumbnail */}
            <div className="relative aspect-[2/3] w-10 sm:w-12 shrink-0 overflow-hidden bg-[#010101] shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(0,0,0,0.4)]">
              {m.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w154${m.poster_path}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-100 opacity-60"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-space text-[8px] text-neutral-600 group-hover:text-white">
                  NA
                </div>
              )}
            </div>

            {/* Title + role */}
            <div className="flex-1 min-w-0 px-2 sm:px-4">
              <p className="truncate font-manrope text-[16px] sm:text-[19px] font-bold text-white/80 transition-colors duration-200 group-hover:text-white">
                {creditTitle(m)}
              </p>
              {role && (
                <p className="mt-1 truncate font-space text-[11px] sm:text-[13px] text-neutral-500 transition-colors duration-200 group-hover:text-white/80">
                  {m.character ? (
                    <>
                      <span className="opacity-50">as </span>
                      {m.character}
                    </>
                  ) : (
                    m.job
                  )}
                </p>
              )}
            </div>

            {/* Type */}
            <div className="flex shrink-0 items-center justify-end w-16 sm:w-20">
              <span className="flex items-center justify-center bg-neutral-900 px-3 py-1.5 font-space text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition-all duration-200 group-hover:bg-neutral-800 group-hover:text-white shadow-sm">
                {m.media_type === "tv" ? "TV" : "Film"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
