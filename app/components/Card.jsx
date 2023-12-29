"use client";

import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Card(props) {
  const router = useRouter();
  const handleInfo = (id) => {
    router.push(`/movie?id=${id}`);
  };
  return (
    <>
      <div className="lg:col-span-3 col-span-6 text-white">
        <div
          onClick={() => handleInfo(props.id)}
          className="group relative shadow-inner bg-white/20 lg:rounded-xl rounded-lg lg:h-96 h-52"
        >
          <Image
            src={`https://image.tmdb.org/t/p/original/${props.src}`}
            width={1000}
            height={1000}
            alt={props.title}
            priority={true}
            className="w-full lg:h-96 h-52 lg:rounded-xl rounded-lg object-cover object-center"
          />
          <div className="absolute lg:rounded-xl rounded-lg w-full h-full inset-0 bg-gradient-to-b from-black/0 from-20% via-black/30 via-50% to-black/50 to-80%"></div>
          <div className="absolute lg:bottom-4 bottom-0 lg:p-6 px-3 py-4">
            <h1 className="lg:text-3xl leading-5 lg:font-bold font-semibold text-white/90 mb-6">
              {props.title}
            </h1>
            <p className="leading-3 text-sm font-semibold">
              {props.release_date.slice(0, 4)}
            </p>
          </div>
          <div className="lg:flex hidden absolute top-2 right-0 px-6 py-3 font-semibold items-center gap-6">
            <h1 className="text-xs bg-black/50 backdrop-blur-sm py-1 px-2 rounded-full">
              {props.vote_average}% Rating
            </h1>
          </div>
          <div className="group absolute inset-0 flex items-center justify-center group-hover:bg-black/60 transition duration-300 ease-in-out">
            <div className="hidden group-hover:flex w-14 h-14 backdrop-blur-sm bg-white/5 flex items-center justify-center rounded-full transition duration-300 ease-in-out">
              <ArrowUpRightIcon className="w-6 h-6 stroke-2 stroke-green-500" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
