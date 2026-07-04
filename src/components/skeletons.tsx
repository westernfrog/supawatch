import { cn } from "@/lib/utils";

/* Layout-matched loading skeletons. Each mirrors the geometry of the real
   component it stands in for (same heights, paddings, and grid tracks) so
   the page doesn't jump when content streams in. */

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-white/[0.05]", className)} />;
}

/* Matches the MediaGrid / ShowReel section header: red bar + eyebrow + title. */
function SectionHeaderSkeleton() {
  return (
    <div className="mb-6 px-5 md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4">
        <div className="h-9 w-1 shrink-0 bg-[#e50914]/40" />
        <div className="flex flex-col justify-center gap-1.5">
          <Sk className="h-2.5 w-24" />
          <Sk className="h-5 w-44" />
        </div>
      </div>
    </div>
  );
}

/* Matches Hero / MoviesHero / TvHero / detail-page heroes:
   full viewport on desktop, 72vh image + text block on mobile. */
export function HeroSkeleton() {
  return (
    <>
      {/* Desktop */}
      <section className="relative hidden h-screen overflow-hidden bg-[#010101] lg:block">
        <div className="absolute inset-x-12 bottom-0 pb-7">
          <Sk className="mb-5 h-20 w-[460px]" />
          <Sk className="mb-2 h-4 w-[520px]" />
          <Sk className="mb-5 h-4 w-[380px]" />
          <div className="mb-5 flex items-center gap-3">
            <Sk className="h-4 w-12" />
            <Sk className="h-4 w-10" />
            <Sk className="h-4 w-16" />
            <Sk className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-5">
            <Sk className="h-11 w-11 rounded-full" />
            <Sk className="h-4 w-28" />
            <Sk className="h-4 w-20" />
          </div>
        </div>
      </section>

      {/* Mobile / tablet */}
      <section className="lg:hidden">
        <div
          className="animate-pulse bg-neutral-900/40"
          style={{ height: "72vh", minHeight: "500px" }}
        />
        <div className="bg-[#010101] px-5 py-5">
          <Sk className="mb-3 h-3 w-24" />
          <Sk className="mb-4 h-9 w-52" />
          <Sk className="mb-2 h-3 w-full" />
          <Sk className="h-3 w-3/4" />
        </div>
      </section>
    </>
  );
}

/* Matches ShowReel: header + horizontal strip of 16:9 cards with text below. */
export function ReelSkeleton() {
  return (
    <div className="py-12 lg:py-16">
      <SectionHeaderSkeleton />
      <div className="px-5 md:px-8 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex gap-4 overflow-hidden pb-4 md:gap-5 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex w-[400px] shrink-0 flex-col sm:w-[500px] md:w-[580px] lg:w-[660px]"
              >
                <Sk className="aspect-[16/9] w-full" />
                <div className="flex flex-col gap-2 pt-4">
                  <Sk className="h-6 w-3/4" />
                  <Sk className="h-4 w-40" />
                  <div className="mt-1 flex items-center gap-2">
                    <Sk className="h-6 w-6 rounded-full" />
                    <Sk className="h-6 w-6 rounded-full" />
                    <Sk className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Matches MediaGrid: header + 3/6-column poster grid. */
export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="pt-16 pb-12 lg:pt-24 lg:pb-16">
      <SectionHeaderSkeleton />
      <div className="px-5 md:px-8 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-3 sm:grid-cols-6">
            {Array.from({ length: count }).map((_, i) => (
              <Sk key={i} className="aspect-[2/3] w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Matches the movie/tv detail body: synopsis paragraph + cast section. */
export function DetailBodySkeleton() {
  return (
    <>
      {/* Synopsis */}
      <div className="px-8 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1400px]">
          <Sk className="mb-6 h-5 w-28" />
          <Sk className="mb-3 h-4 w-full max-w-[75ch]" />
          <Sk className="mb-3 h-4 w-full max-w-[65ch]" />
          <Sk className="h-4 w-2/3 max-w-[50ch]" />
        </div>
      </div>

      {/* Cast — lead actor feature + row of portraits */}
      <div className="px-8 pb-16 pt-16 lg:px-12 lg:pt-20">
        <div className="mx-auto max-w-[1400px]">
          <Sk className="mb-8 h-5 w-16" />
          <div className="mb-12 flex flex-col gap-8 md:flex-row">
            <div className="w-1/3 shrink-0 sm:w-1/6">
              <Sk className="aspect-[2/3] w-full" />
              <Sk className="mt-3 h-3 w-24" />
            </div>
            <div className="flex flex-1 flex-col justify-center gap-3">
              <Sk className="h-3 w-24" />
              <Sk className="h-4 w-full max-w-[60ch]" />
              <Sk className="h-4 w-full max-w-[55ch]" />
              <Sk className="h-4 w-3/4 max-w-[40ch]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-y-8 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Sk className="aspect-[2/3] w-full" />
                <Sk className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* Matches PersonPageHero: padded header with portrait + facts columns. */
export function PersonHeroSkeleton() {
  return (
    <section className="px-6 pb-16 pt-28 lg:px-12 lg:pb-20 lg:pt-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-10 md:flex-row md:gap-14">
          <div className="w-2/3 shrink-0 sm:w-1/3 lg:w-1/4">
            <Sk className="aspect-[2/3] w-full" />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-4">
            <Sk className="h-3 w-24" />
            <Sk className="h-12 w-72 max-w-full" />
            <Sk className="mt-2 h-4 w-full max-w-[65ch]" />
            <Sk className="h-4 w-full max-w-[58ch]" />
            <Sk className="h-4 w-2/3 max-w-[40ch]" />
            <div className="mt-3 flex gap-8">
              <Sk className="h-10 w-20" />
              <Sk className="h-10 w-20" />
              <Sk className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Matches SearchClient: centered search bar + poster grid. */
export function SearchSkeleton() {
  return (
    <div className="min-h-screen bg-[#010101] pt-28 lg:pt-32">
      <div className="px-5 md:px-8 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="w-full max-w-[640px] border-b border-white/15 pb-3">
            <Sk className="h-8 w-64" />
          </div>
          <div className="mt-6 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Sk key={i} className="h-8 w-20" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-10 px-5 pb-24 md:px-8 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-3 sm:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Sk key={i} className="aspect-[2/3] w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Matches LiveClient: TV player + remote on desktop, channel grid below. */
export function LiveSkeleton() {
  return (
    <div className="min-h-screen bg-[#010101]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center gap-6 px-4 pb-12 pt-28 md:flex-row md:items-stretch md:gap-8 md:px-8 md:pb-6 md:pt-8 lg:gap-10 lg:px-12">
        <div className="flex w-full flex-col justify-center md:flex-1">
          <Sk className="aspect-video w-full rounded-2xl" />
        </div>
        <div className="hidden w-[210px] shrink-0 md:block">
          <Sk className="h-[480px] w-full rounded-[2.2rem]" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1500px] px-4 pb-24 sm:px-8 lg:px-12">
        <Sk className="mb-6 h-5 w-40" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Sk key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* Assembled page shells. `srLabel` keeps the state announced for
   screen readers while everything else is decorative. */
export function ListingPageSkeleton({ srLabel }: { srLabel: string }) {
  return (
    <div className="min-h-screen bg-[#010101]" aria-busy="true">
      <span className="sr-only" aria-live="polite">
        {srLabel}
      </span>
      <HeroSkeleton />
      <ReelSkeleton />
      <GridSkeleton />
    </div>
  );
}

export function DetailPageSkeleton({ srLabel }: { srLabel: string }) {
  return (
    <div className="min-h-screen bg-[#010101]" aria-busy="true">
      <span className="sr-only" aria-live="polite">
        {srLabel}
      </span>
      <HeroSkeleton />
      <DetailBodySkeleton />
      <GridSkeleton />
    </div>
  );
}
