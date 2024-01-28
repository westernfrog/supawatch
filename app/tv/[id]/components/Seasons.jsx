"use client";

import { PlayIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";

export default function Seasons(props) {
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
        const response = await fetch(
          `/api/getEpisodes?id=${id}&season=${props.season}`
        );
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
      <div className="relative space-y-2 lg:px-10 p-6">
        <h1 className="font-semibold tracking-tighter text-xl lg:text-3xl">
          {season && season.name}
        </h1>
        <p className="text-xl font-medium tracking-tight">
          {season?.episodes.length < 1 ? "This season is yet to come" : ""}
        </p>
        <div className="flex flex-row items-start gap-4 overflow-x-auto snap-x pb-3">
          {season &&
            season.episodes.map((item, index) => (
              <button
                key={index}
                className="relative group flex-shrink-0 snap-start p-1 lg:w-96 w-64 h-full"
              >
                <div className="relative flex flex-col">
                  <img
                    src={
                      item.still_path
                        ? `https://image.tmdb.org/t/p/w500/${item.still_path}`
                        : "https://images.unsplash.com/photo-1464639351491-a172c2aa2911?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGJsYWNrJTIwYmFja2dyb3VuZHxlbnwwfHwwfHx8MA%3D%3D"
                    }
                    alt={item.name}
                    className="w-full lg:h-64 h-40 object-cover object-center rounded-lg"
                  />
                  <div className="absolute top-2 left-2 z-10 bg-white/10 backdrop-blur-xl font-semibold px-3 py-1 rounded-full lg:text-sm text-xs">
                    #{item.episode_number} episode
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 group-hover:bg-black/80 transition duration-300 ease-in-out rounded-lg">
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
    </>
  );
}
