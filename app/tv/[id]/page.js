"use client";

import { PlayIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";
import Seasons from "./components/Seasons";

export default function TVSeries() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [season, setSeason] = useState(null);
  const [play, setPlay] = useState(false);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/getTVSeriesDetails?id=${id}`);
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
        <>
          <section className="relative lg:h-screen">
            <div className="relative w-full h-full bg-gradient-to-b from-white/20 to-neutral-900/80">
              <img
                src={`https://image.tmdb.org/t/p/original${data.backdrop_path}}`}
                alt="Backdrop"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute top-0 inset-0 lg:bg-black/30 bg-gradient-to-b from-black/60 from-20% via-black/50 via-40% to-[#010101] to-98%"></div>
            </div>
            <div className="lg:absolute inset-x-10 inset-y-16 flex lg:flex-row lg:items-end justify-between gap-6 lg:p-0 p-6">
              <div className="lg:space-y-6 space-y-4 lg:w-[60%]">
                <h1 className="lg:text-8xl text-4xl font-bold tracking-tighter">
                  {data.name}
                </h1>
                <div className="flex items-center lg:text-base text-sm lg:divide-x font-medium lg:gap-0 gap-6">
                  <p className="text-green-500 lg:pe-8">
                    {Math.floor(data.vote_average * 10)}% Rating
                  </p>
                  <h1 className="lg:px-8">
                    {data.seasons.length}
                    {data.seasons.length > 1 ? " Seasons" : " Season"}
                  </h1>
                  <h1 className="lg:px-8">
                    {data.first_air_date.slice(0, 4)}-
                    {data.last_air_date.slice(0, 4)}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center lg:gap-4 gap-3">
                  {data.genres.map((item) => (
                    <Link
                      key={item.id}
                      href={`/item/${item.id}`}
                      className="lg:px-4 px-3 py-2 bg-white/10 font-medium backdrop-blur rounded-full text-sm lg:text-base"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <p className="lg:text-lg text-base opacity-70">
                  {data.overview}
                </p>
              </div>
              <div className="space-y-2 lg:w-[50%]">
                <h1 className="font-semibold tracking-tighter text-xl lg:text-3xl">
                  {season && season.name}
                </h1>
              </div>
            </div>
          </section>
          {data.seasons.map((item, index) => (
            <Seasons key={index} season={item.season_number} />
          ))}
        </>
      ) : (
        <section className="relative h-screen animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 from-10% via-black/10 via-80% to-black/20 to-90%"></div>
        </section>
      )}
    </>
  );
}
