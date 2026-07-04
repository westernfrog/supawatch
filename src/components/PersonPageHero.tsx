"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import BackButton from "@/components/BackButton";
import { cn } from "@/lib/utils";

interface ExternalLink {
  label: string;
  url: string;
}

interface Props {
  name: string;
  department: string;
  biography: string;
  profilePath: string | null;
  backdropPath: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  creditsCount: number;
  yearsActive: string | null;
  departments: string[];
  knownForTitles: string[];
  externalLinks: ExternalLink[];
  profiles?: { file_path: string }[];
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function calcAge(birthDate: string, deathDate: string | null) {
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  return age;
}

export default function PersonPageHero({
  name,
  department,
  biography,
  profilePath,
  birthday,
  deathday,
  placeOfBirth,
  creditsCount,
  yearsActive,
  knownForTitles,
  externalLinks,
  profiles = [],
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(profilePath);

  const age = birthday ? calcAge(birthday, deathday) : null;
  const longBio = biography.length > 600;

  const vitals: string[] = [];
  if (birthday) vitals.push(fmt(birthday));
  if (deathday) vitals.push(`d. ${fmt(deathday)}`);
  else if (age !== null) vitals.push(`${age} yrs old`);
  if (placeOfBirth) vitals.push(placeOfBirth);
  if (yearsActive) vitals.push(yearsActive);
  if (creditsCount) vitals.push(`${creditsCount} credits`);

  return (
    <section className="px-6 pb-16 pt-28 lg:px-12 lg:pb-20 lg:pt-32">
      {/* Nav */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-6 lg:px-12">
        <BackButton />
        <span className="font-space text-[9px] uppercase tracking-[0.3em] text-neutral-500">
          {department}
        </span>
      </div>

      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16 xl:gap-20">
          {/* ── Portrait ── */}
          <div className="w-48 shrink-0 sm:w-60 lg:w-72 xl:w-80">
            <div
              className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900"
              style={{
                boxShadow:
                  "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              {activePhoto ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${activePhoto}`}
                  alt={name}
                  className="h-full w-full object-cover object-center transition-opacity duration-300"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-nichrome text-7xl text-neutral-700 uppercase tracking-tight">
                  {name[0]}
                </div>
              )}
            </div>
          </div>

          {/* ── Info + Bio ── */}
          <div className="flex min-w-0 flex-1 flex-col gap-7">
            {/* Department + known for */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-space text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                {department}
              </span>
              {knownForTitles.length > 0 && (
                <>
                  <span className="text-white/15">·</span>
                  <span className="font-manrope text-[12px] text-neutral-600">
                    {knownForTitles.join(", ")}
                  </span>
                </>
              )}
            </div>

            {/* Name */}
            <h1
              className="font-nichrome font-black uppercase leading-[0.82] text-white tracking-tight"
              style={{ fontSize: "clamp(2.8rem, 6vw, 7.5rem)" }}
            >
              {name}
            </h1>

            {/* Vitals strip */}
            {vitals.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                {vitals.map((v, i) => (
                  <span key={i} className="flex items-center gap-2.5">
                    {i > 0 && <span className="text-white/15">·</span>}
                    <span
                      className={cn(
                        "font-space text-[12px] text-neutral-500",
                        deathday && v.startsWith("d.") && "italic",
                      )}
                    >
                      {v}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* External links */}
            {externalLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {externalLinks.map((l) => (
                  <a
                    key={l.label}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 border border-white/10 px-3 py-1.5 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <span className="font-space text-[10px] uppercase tracking-[0.15em] text-white/50 transition-colors group-hover:text-white">
                      {l.label}
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-white/25 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                  </a>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="h-px w-full bg-white/[0.06]" />

            {/* Thumbnail gallery */}
            {profiles.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {profiles.slice(0, 16).map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(p.file_path)}
                    className={cn(
                      "relative aspect-[2/3] w-10 shrink-0 overflow-hidden transition-all duration-200",
                      activePhoto === p.file_path
                        ? "opacity-100 ring-1 ring-white/60"
                        : "opacity-40 hover:opacity-75",
                    )}
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w92${p.file_path}`}
                      alt={`${name} ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Biography */}
            {biography ? (
              <div>
                <p
                  className={cn(
                    "font-manrope text-[15px] leading-[2] text-neutral-400 md:text-[16px] md:leading-[2.1]",
                    !expanded && longBio && "line-clamp-[8]",
                  )}
                >
                  {biography}
                </p>
                {longBio && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-5 font-space text-[10px] uppercase tracking-[0.22em] text-neutral-600 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {expanded ? "Collapse" : "Read full biography"}
                  </button>
                )}
              </div>
            ) : (
              <p className="font-manrope text-[12px] uppercase tracking-[0.18em] text-neutral-700">
                No biography available.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
