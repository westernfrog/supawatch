import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

export default function Card(props) {
  return (
    <>
      <div className="col-span-3 text-white">
        <div className="group relative shadow-inner bg-white/20 rounded-2xl h-96">
          <Image
            src={`https://image.tmdb.org/t/p/original/${props.backdrop_path}`}
            width={5000}
            height={5000}
            alt={props.title}
            className="w-full h-96 rounded-2xl object-cover object-center"
          />
          <div className="absolute w-full h-full inset-0 bg-gradient-to-b from-black/30 from-20% via-black/70 via-70% to-black/80 to-80%"></div>
          <div className="absolute bottom-4 p-6">
            <h1 className="text-2xl font-bold mb-2">{props.title}</h1>
            <p className="text-gray-300">{props.overview}..</p>
          </div>
          <div className="absolute top-2 right-0 px-6 py-3 font-semibold flex items-center gap-6">
            <h1 className="text-xs bg-black/30 py-1 px-2 rounded-full">
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
