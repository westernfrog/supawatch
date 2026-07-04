"use client";

import BlurImage from "@/components/BlurImage";

interface Props {
  profiles: { file_path: string }[];
  name: string;
}

export default function PersonPhotoGallery({ profiles, name }: Props) {
  const shots = profiles.slice(1, 18);
  if (shots.length === 0) return null;

  return (
    <section className="border-b border-white/[0.06] py-14 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex items-center gap-5 px-6 lg:px-12">
          <span className="shrink-0 font-manrope text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-400">
            Gallery
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="shrink-0 font-space text-[10px] uppercase tracking-[0.2em] text-neutral-700">
            {shots.length} Frames
          </span>
        </div>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-4 scrollbar-hide md:gap-4 lg:px-12">
          {shots.map((p, i) => (
            <figure
              key={i}
              className="group relative aspect-[2/3] w-[180px] shrink-0 snap-start overflow-hidden bg-neutral-900 md:w-[220px] lg:w-[260px]"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
            >
              <BlurImage
                src={`https://image.tmdb.org/t/p/w500${p.file_path}`}
                alt={`${name} — ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/60 to-transparent" />
              <figcaption className="pointer-events-none absolute bottom-2.5 left-3 font-space text-[10px] uppercase tracking-[0.22em] text-white/50">
                {String(i + 1).padStart(2, "0")}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
