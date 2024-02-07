"use client";

import { PlayIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Popular() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/getMovieList?list=popular&page=${page}`
      );
      const fetchedData = await response.json();
      if (page === 1) {
        setData(fetchedData.data.results);
      } else {
        setData((prevData) => [...prevData, ...fetchedData.data.results]);
      }
      setPage(page + 1);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      <section className="relative">
        <div className="lg:h-64 h-32 bg-white/10">
          <img
            src="https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Search Backdrop"
            className="w-full h-full object-cover object-bottom"
          />
          <div className="absolute top-0 bg-black/30 inset-0 bg-gradient-to-b from-black/60 from-20% via-black/50 via-40% to-[#010101] to-80%"></div>
          <div className="absolute lg:inset-x-8 lg:inset-y-32 inset-x-6 inset-y-24">
            <h1 className="font-semibold lg:text-9xl text-2xl tracking-tighter lg:mb-0 mb-2">
              Popular Movies
            </h1>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-12 gap-4 lg:p-10 p-6">
        {data.map((item, index) => (
          <Link
            key={index}
            href={`/movie/${item.id}`}
            className="relative group lg:col-span-2 col-span-6 flex-shrink-0 snap-start max-h-80 lg:max-h-96"
          >
            <div className="relative rounded-lg bg-white/20">
              <img
                src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                alt={item.title}
                className="h-full object-cover object-center rounded-lg"
              />
              <div className="absolute top-0 inset-0 bg-black/50 group-hover:bg-black/80 transition duration-300 ease-in-out"></div>
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
      </section>
      {loading ? (
        <div className="flex justify-center mt-4">
          <button
            className="lg:px-8 px-3 py-3 bg-white/10 backdrop-blur rounded-full text-sm lg:text-base"
            disabled
          >
            Loading...
          </button>
        </div>
      ) : (
        <div className="flex justify-center mt-4">
          <button
            className="lg:px-8 px-3 py-3 bg-white/10 backdrop-blur rounded-full text-sm lg:text-base"
            onClick={fetchData}
          >
            More
          </button>
        </div>
      )}
    </>
  );
}
