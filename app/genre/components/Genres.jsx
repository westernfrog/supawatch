"use client";

import { PlayIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Genres(props) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/getMovieDiscover?genre=${props.genre}&page=1`
        );
        const fetchedData = await response.json();

        setData(fetchedData.data.results[18]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      {!loading ? (
        <Link
          href={`/genre/${props.genre}`}
          className="relative group lg:col-span-2 col-span-6 flex-shrink-0 snap-start max-h-80 lg:max-h-96"
        >
          <div className="relative rounded-lg bg-white/20">
            <img
              src={`https://image.tmdb.org/t/p/w500/${data.poster_path}`}
              alt={props.name}
              className="h-full object-cover object-center rounded-lg"
            />
            <div className="absolute top-0 inset-0 bg-black/60 group-hover:bg-black/80 transition duration-300 ease-in-out"></div>
            <div className="flex transition duration-300 ease-in-out absolute z-40 inset-0 items-center justify-center">
              <div className="flex items-center justify-center gap-1 rounded-full">
                <h1 className="font-semibold lg:text-3xl text-xl tracking-tight">
                  {props.name}
                </h1>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <></>
      )}
    </>
  );
}
