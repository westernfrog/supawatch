"use client";

import Link from "next/link";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlayIcon, RectangleGroupIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";

export default function Overview(props) {
  const { id } = useParams();
  const [open, setOpen] = useState(false);
  const cancelButtonRef = useRef(null);
  const [trailer, setTrailer] = useState(null);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    async function fetchTrailers() {
      try {
        const response = await fetch(`/api/getTrailer?id=${id}`);
        const fetchedTrailer = await response.json();
        setTrailer(fetchedTrailer);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }
    fetchTrailers();
  }, []);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const response = await fetch(`/api/getCredits?id=${id}`);
        const fetchedCredits = await response.json();
        setCredits(fetchedCredits);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }
    fetchCredits();
  }, []);

  return (
    <>
      <section className="max-w-7xl mx-auto lg:h-screen flex items-center justify-center lg:my-40">
        <div className="lg:grid lg:grid-cols-12 items-start lg:p-10 p-6 gap-x-20 gap-6 w-full">
          <div className="lg:col-span-4">
            <div className="relative bg-gradient-to-b from-white/20 to-white/80 rounded-lg lg:w-full h-full">
              <img
                src={`https://image.tmdb.org/t/p/w500/${props.poster_path}`}
                alt="Backdrop"
                className="w-full h-full object-contain object-center rounded-lg"
              />
              <div className="absolute top-0 bg-black/50 inset-0"></div>
            </div>
            <div className="flex flex-row items-center lg:gap-4 gap-3 my-6">
              <button
                type="button"
                onClick={props.setPlay}
                className="flex-shrink-0 flex items-center gap-3"
              >
                <div className="backdrop-blur-xl bg-white/10 p-3 rounded-full active:scale-95 transition duration-300 ease-in-out">
                  <PlayIcon className="lg:w-10 lg:h-10 w-8 h-8 ps-1" />
                </div>
              </button>
              <button
                onClick={() => setOpen(true)}
                className="lg:px-10 p-4 lg:text-base text-sm bg-neutral-300 rounded-full text-neutral-900 tracking-tight font-semibold flex items-center justify-center gap-2 w-full"
              >
                <span>Watch Trailer</span>
                <PlayIcon className="w-5 h-5" />
              </button>
              <Transition.Root show={open} as={Fragment}>
                <Dialog
                  as="div"
                  className="relative z-50"
                  initialFocus={cancelButtonRef}
                  onClose={setOpen}
                >
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
                  </Transition.Child>
                  <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
                      <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                      >
                        <Dialog.Panel className="relative transform overflow-hidden lg:rounded-2xl rounded-lg bg-white/20 shadow-xl transition-all my-8 w-full max-w-6xl lg:h-[40em] h-64">
                          <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${
                              trailer && trailer.key
                            }`}
                            allowFullScreen
                          ></iframe>
                        </Dialog.Panel>
                      </Transition.Child>
                    </div>
                  </div>
                </Dialog>
              </Transition.Root>
            </div>
          </div>
          <div className="lg:col-span-8 space-y-6">
            <div className="space-y-2">
              <h1 className="lg:text-4xl text-3xl font-semibold text-dm text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-yellow-700">
                Storyline
              </h1>
              <p className="lg:text-xl text-lg">{props.overview}</p>
            </div>
            <div className="flex items-center gap-4">
              {props.genres.map((item) => (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className="lg:px-4 px-3 py-2 bg-white/10 font-medium backdrop-blur rounded-full"
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center font-medium lg:gap-16 gap-8 lg:text-lg text-base">
              <p className="text-green-500">
                {Math.floor(props.vote_average * 10)}% Rating
              </p>
              <p>{props.release_date.slice(0, 4)}</p>
              <p>
                {Math.floor(props.runtime / 60)}h {props.runtime % 60}min
              </p>
            </div>
            <div className="space-y-4">
              <h1 className="lg:text-2xl text-xl font-semibold">Casts</h1>
              <div className="flex flex-row items-start gap-4 overflow-x-auto pb-6 ps-1 snap-x">
                {credits &&
                  credits.data.cast.map((item, index) => (
                    <Link
                      key={index}
                      href={`/people/${item.id}`}
                      className="relative group flex-shrink-0 snap-start"
                    >
                      <div className="relative rounded-lg bg-white/10 flex flex-col">
                        <img
                          src={
                            item.profile_path
                              ? `https://image.tmdb.org/t/p/w500/${item.profile_path}`
                              : "https://images.unsplash.com/photo-1464639351491-a172c2aa2911?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGJsYWNrJTIwYmFja2dyb3VuZHxlbnwwfHwwfHx8MA%3D%3D"
                          }
                          alt={item.name}
                          className="w-full h-64 object-contain object-center rounded-lg"
                        />
                        <div className="absolute top-0 inset-0 bg-black/40 group-hover:bg-black/80 transition duration-300 ease-in-out"></div>
                      </div>
                      <h1 className="text-center py-3 text-sm text-neutral-400">
                        {item.name}
                      </h1>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
