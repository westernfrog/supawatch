import { PersonHeroSkeleton, ReelSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#010101]" aria-busy="true">
      <span className="sr-only" aria-live="polite">
        Person details are loading
      </span>
      <PersonHeroSkeleton />
      <ReelSkeleton />
    </div>
  );
}
