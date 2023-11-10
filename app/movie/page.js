"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { InformationCircleIcon, PlayIcon } from "@heroicons/react/24/outline";

export default function Movie() {
  const router = useSearchParams();
  const id = router.get("id");
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/getMovieDetails?id=${id}`);
        const fetchedData = await response.json();
        setData(fetchedData.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, [id]);

  return (
    <>
      {data ? (
        <section className="relative grid h-[30em]">
          <div className="h-[30em]">
            <Image
              className="w-full h-full object-cover object-center"
              src={`https://image.tmdb.org/t/p/original/${data.backdrop_path}`}
              width={5000}
              height={5000}
              alt="Latest"
            />
            <div className="absolute top-0 inset-0 bg-black/50 bg-gradient-radial from-black/40 from-10% via-black/70 via-50% to-black/90 to-90%"></div>
          </div>
          <div className="absolute lg:top-20 top-14">
            <div className="grid lg:grid-cols-12 items-start gap-12 text-gray-300 lg:px-16 p-6">
              <div className="relative lg:col-span-3 col-span-6 rounded-xl ring-1 ring-white/20 shadow-xl">
                <Image
                  className="object-cover object-center rounded-xl"
                  src={`https://image.tmdb.org/t/p/original/${data.poster_path}`}
                  width={5000}
                  height={5000}
                  alt="Latest"
                />
                <div className="absolute top-0 inset-0 bg-black/20 bg-gradient-to-b lg:bg-gradient-radial from-black/20 from-10% via-black/50 via-50% to-black/60 to-90% rounded-xl"></div>
              </div>
              <div className="col-span-6 text-white w-full space-y-2 py-6">
                <div className="flex flex-wrap items-center gap-x-8 font-semibold text-gray-300 lg:text-base text-sm pb-2">
                  <p className="text-green-500">
                    {Math.floor(data.vote_average * 10)}% Match
                  </p>
                  <p>{data.release_date.slice(0, 4)}</p>
                </div>
                <h1 className="text-4xl font-semibold tracking-tight">
                  {data.title}
                </h1>
                <p className="text-gray-300 lg:text-lg text-base">
                  {data.overview}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 font-medium text-gray-300 lg:text-base text-sm pt-3 pb-6">
                  {data.genres.map((genre) => (
                    <p
                      key={genre}
                      className="bg-white/20 px-3 py-1 rounded-full text-sm"
                    >
                      {genre.name}
                    </p>
                  ))}
                </div>
                <button className="bg-white lg:px-5 px-3 py-3 rounded-full flex items-center gap-2 tracking-tight text-gray-900 font-semibold">
                  <PlayIcon className="w-6 h-6 stroke-0 fill-gray-900" />
                  Watch Trailer
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative h-screen grid items-center">
          <Image
            className="w-full h-full object-cover object-center"
            src="https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            width={5000}
            height={5000}
            alt="Latest"
          />
          <div className="absolute top-0 inset-0 bg-black/50 bg-gradient-to-b lg:bg-gradient-radial from-black/40 from-10% via-black/70 via-50% to-black/90 to-90%"></div>
          <h1 className="absolute grid items-center justify-center left-0 right-0 text-gray-300 lg:text-xl text-xl font-semibold">
            Loading...
          </h1>
        </section>
      )}
    </>
  );
}
