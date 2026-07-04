import BlurImage from "@/components/BlurImage";

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export default function TvCastGrid({ cast }: { cast: CastMember[] }) {
  return (
    <div className="grid grid-cols-3 gap-y-8 sm:grid-cols-6">
      {cast.map((c) => (
        <div key={c.id} className="group flex flex-col gap-3">
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900">
            {c.profile_path ? (
              <BlurImage
                src={`https://image.tmdb.org/t/p/w342${c.profile_path}`}
                alt={c.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-manrope text-[11px] text-neutral-600">
                {c.name[0]}
              </div>
            )}
          </div>
          
          <div className="flex flex-col">
            <p className="font-manrope text-[13px] font-light italic leading-tight text-white/90">
              {c.name}
            </p>
            {c.character && (
              <p className="mt-1 font-space text-[9px] uppercase leading-tight tracking-wider text-white/50">
                {c.character}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
