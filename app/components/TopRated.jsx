"use client";

import { ArrowLongLeftIcon } from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TopRated(params) {
  const [data, setData] = useState(null);
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/getMovieList?list=top_rated`);
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
            <h1 className="text-lg tracking-tight font-medium text-neutral-200">
              Top Rated Movies
            </h1>
            <Link
              href="/"
              className="flex items-center gap-2 text-neutral-200 lg:text-base"
            >
              <ArrowLongLeftIcon className="w-6 h-6 stroke-neutral-200" />
              See More
            </Link>
          </div>
          <div className="lg:px-10 px-6 py-4">
            <div className="grid grid-cols-12 gap-4">
              {data.results.slice(0, 18).map((item, index) => (
                <Link
                  key={index}
                  href={"/movie/" + item.id}
                  className="group lg:col-span-2 col-span-6"
                >
                  <div className="relative h-full">
                    <img
                      src={
                        item.poster_path
                          ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
                          : "https://images.unsplash.com/photo-1601925662822-510b76665bd9?q=80&w=1780&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                      }
                      alt="Backdrop"
                      className="h-full object-cover object-center rounded-lg"
                    />
                    <div className="absolute top-0 inset-0 bg-black/40 group-hover:bg-black/80 transition duration-300 ease-in-out rounded-lg"></div>
                    <div className="hidden group-hover:flex transition duration-300 ease-in-out absolute z-40 inset-0 items-center justify-center rounded-lg">
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
