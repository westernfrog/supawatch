"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import { useParams } from "next/navigation";

export default function Overview(props) {
  const { id } = useParams();
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const response = await fetch(`/api/getCredits?id=${id}`);
        const fetchedCredits = await response.json();
        setCredits(fetchedCredits);
      } catch (error) {
        console.error("Error fetching credits:", error);
      }
    }
    fetchCredits();
  }, []);

  return (
    <>
      <section className="lg:py-20 py-12 bg-[#010101]">
        <div className="max-w-7xl mx-auto lg:px-16 px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Storyline</h2>
                <p className="text-lg leading-relaxed opacity-90">
                  {props.overview}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-base">
                <div className="flex items-center gap-2">
                  <span className="text-red-500 font-semibold">
                    {Math.floor(props.vote_average * 10)}%
                  </span>
                  <span className="opacity-70">Match</span>
                </div>
                <div className="opacity-80">
                  {props.release_date?.slice(0, 4)}
                </div>
                <div className="opacity-80">
                  {Math.floor(props.runtime / 60)}h {props.runtime % 60}min
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {props.genres?.map((item) => (
                  <Link
                    key={item.id}
                    href={`/genre/${item.id}`}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-full text-sm font-medium"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Column - Cast */}
            <div className="lg:col-span-1 space-y-6">
              <h3 className="text-2xl font-bold">Cast</h3>
              <div className="space-y-4">
                {credits &&
                  credits?.data?.cast?.slice(0, 8).map((item) => (
                    <Link
                      key={item.id}
                      href={`/person/${item.id}`}
                      className="flex items-center gap-4 group"
                    >
                      <div className="relative rounded-full overflow-hidden w-12 h-12 shrink-0 bg-white/10">
                        {item.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w200${item.profile_path}`}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <span className="text-xl opacity-50">👤</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate group-hover:text-white/80">
                          {item.name}
                        </p>
                        <p className="text-xs opacity-60 truncate">
                          {item.character}
                        </p>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
