"use client";

import { ArrowLongLeftIcon } from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TVList(props) {
  const [data, setData] = useState(null);
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `/api/getTVList?list=${props.list}&page=1`
        );
        const fetchedData = await response.json();
        setData(fetchedData.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, []);
  return (
    <>
      {data ? (
        <section className="relative">
          <div className="lg:px-10 px-6 pt-10 flex items-center justify-between">
            <h1 className="lg:text-2xl text-lg font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-yellow-700">
              {props.title}
            </h1>
            {props.list == "popular" ? (
              <></>
            ) : (
              <Link
                href={"/tv"}
                className="flex items-center gap-2 text-neutral-200 lg:text-lg"
              >
                <ArrowLongLeftIcon className="w-6 h-6 stroke-neutral-200" />
                See More
              </Link>
            )}
          </div>
          <div className="lg:px-10 px-6">
            <div className="flex items-center gap-4 overflow-x-auto py-3 pb-10 ps-1 snap-x">
              {data.results.map((item, index) => (
                <Link
                  key={index}
                  href={`/tv/${item.id}`}
                  className="relative group flex-shrink-0 lg:w-64 w-48 snap-start"
                >
                  <div className="relative rounded-lg bg-white/20 h-full">
                    <img
                      src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
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
