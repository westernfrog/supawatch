"use client";

import { PlayIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";

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

  useEffect(() => {
    async function fetchSeason() {
      try {
        const response = await fetch(`/api/getEpisodes?id=${id}&season=1`);
        const fetchedSeasonData = await response.json();
        setSeason(fetchedSeasonData.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchSeason();
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
            <div className="lg:absolute inset-10 flex lg:flex-row  flex-col lg:items-end justify-between gap-6 lg:p-0 p-6">
              <div className="space-y-4 lg:w-[40%]">
                <h1 className="lg:text-8xl text-4xl font-bold text-dm opacity-80">
                  {data.name}
                </h1>
                <div className="flex items-center lg:text-base text-sm lg:divide-x font-medium lg:gap-0 gap-6">
                  <p className="text-green-500 lg:pe-8">
                    {Math.floor(data.vote_average * 10)}% Rating
                  </p>
                  <h1 className="lg:px-8">
                    {data.seasons.length - 1}
                    {data.seasons.length - 1 > 1 ? " Seasons" : " Season"}
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
                <p className="lg:text-lg text-base">{data.overview}</p>
              </div>
              <div className="space-y-2 lg:w-[50%]">
                <h1 className="font-semibold tracking-tighter text-xl lg:text-3xl">
                  {season && season.name} episodes
                </h1>
                <div className="flex flex-row items-start gap-4 overflow-x-auto snap-x pb-3">
                  {season &&
                    season.episodes.map((item, index) => (
                      <button
                        key={index}
                        className="relative group flex-shrink-0 snap-start p-1 lg:w-80 w-52 h-full"
                      >
                        <div className="relative flex flex-col">
                          <img
                            src={
                              item.still_path
                                ? `https://image.tmdb.org/t/p/w500/${item.still_path}`
                                : "https://images.unsplash.com/photo-1464639351491-a172c2aa2911?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGJsYWNrJTIwYmFja2dyb3VuZHxlbnwwfHwwfHx8MA%3D%3D"
                            }
                            alt={item.name}
                            className="w-full h-full object-cover object-center rounded-2xl"
                          />
                          <div className="absolute top-2 left-2 z-10 bg-white/10 backdrop-blur-xl font-semibold px-3 py-1 rounded-full lg:text-sm text-xs">
                            #{item.episode_number} episode
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 group-hover:bg-black/80 transition duration-300 ease-in-out rounded-2xl">
                            <div className="backdrop-blur-xl bg-white/10 lg:p-2 p-2 rounded-full active:scale-95 transition duration-300 ease-in-out">
                              <PlayIcon className="lg:w-8 lg:h-8 w-6 h-6 ps-1" />
                            </div>
                          </div>
                        </div>
                        <h1 className="lg:text-lg text-sm lg:font-semibold font-medium text-center py-3">
                          {item.name}
                        </h1>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="relative h-screen animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 from-10% via-black/10 via-80% to-black/20 to-90%"></div>
        </section>
      )}
    </>
  );
}
