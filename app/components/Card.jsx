import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

export default function Card(props) {
  return (
    <>
      <div className="lg:col-span-3 col-span-6 text-white">
        <div className="group relative shadow-inner bg-white/20 rounded-lg lg:h-96 h-52">
          <Image
            src={`https://image.tmdb.org/t/p/original/${props.src}`}
            width={5000}
            height={5000}
            alt={props.title}
            className="w-full lg:h-96 h-52 rounded-lg object-cover object-center"
          />
          <div className="absolute w-full h-full inset-0 bg-gradient-to-b from-black/30 from-20% via-black/70 via-70% to-black/80 to-80%"></div>
          <div className="absolute lg:bottom-4 bottom-0 lg:p-6 px-2 py-4">
            <h1 className="lg:text-3xl text-lg leading-5 lg:font-bold font-semibold mb-2 lg:mb-1">
              {props.title}
            </h1>
            <p className="lg:block hidden leading-3 lg:text-sm text-xs text-gray-300 pb-4">
              {props.overview}..
            </p>
            <p className="leading-3 text-sm">
              {props.release_date.slice(0, 4)}
            </p>
          </div>
          <div className="lg:flex hidden absolute top-2 right-0 px-6 py-3 font-semibold items-center gap-6">
            <h1 className="text-xs lg:bg-black/30 bg-black/60 py-1 px-2 rounded-full">
              {props.vote_average}% Match
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
