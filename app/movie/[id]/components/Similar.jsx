"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { PlayIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";

export default function Similar(props) {
  const { id } = useParams();
  const [similar, setSimilar] = useState(null);
  useEffect(() => {
    async function fetchSimilar() {
      try {
        const response = await fetch(
          `/api/getSimilar?id=${id}&page=${props.page}`
        );
        const fetchedSimilar = await response.json();
        setSimilar(fetchedSimilar.data);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }
    fetchSimilar();
  }, []);

  return (
    <>
      {similar ? (
        <section className="relative">
          <div className="lg:px-10 px-6">
            <div className="flex items-center gap-4 overflow-x-auto py-3 pb-10 ps-1 snap-x">
              {similar?.results?.map((item, index) => (
                <Link
                  key={index}
                  href={`/movie/${item.id}`}
                  className="relative group flex-shrink-0 lg:w-64 w-48 snap-start h-full"
                >
                  <div className="relative rounded-lg bg-white/20">
                    <img
                      src={
                        item.poster_path
                          ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
                          : "https://images.unsplash.com/photo-1464639351491-a172c2aa2911?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGJsYWNrJTIwYmFja2dyb3VuZHxlbnwwfHwwfHx8MA%3D%3D"
                      }
                      alt={item.title}
                      className="lg:h-96 h-72 object-cover object-center rounded-lg"
                    />
                    <div className="absolute top-0 inset-0 bg-black/40 group-hover:bg-black/80 transition duration-300 ease-in-out"></div>
                    <div className="hidden group-hover:flex transition duration-300 ease-in-out absolute z-40 inset-0 items-center justify-center">
                      <div className="bg-white/10 px-4 py-3 flex items-center justify-center gap-1 rounded-full backdrop-blur-xl backdrop-opacity-60">
                        <h1 className="tracking-tight font-medium text-sm">
                          Watch Now
                        </h1>
                        <PlayIcon className="flex-shrink-0 w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <></>
      )}
    </>
  );
}
