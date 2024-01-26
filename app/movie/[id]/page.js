"use client";

import { PlayIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";

export default function Movie() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [play, setPlay] = useState(false);
  const cancelButtonRef = useRef(null);

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
  }, []);

  console.log(data);
  return (
    <>
      {data ? (
        <section className="relative h-screen">
          <div className="relative w-full h-full bg-gradient-to-b from-white/20 to-neutral-900/80">
            <Image
              src={`https://image.tmdb.org/t/p/original${data.backdrop_path}}`}
              alt="Backdrop"
              width={2000}
              height={2000}
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute top-0 inset-0 bg-black/20 bg-gradient-to-b from-black/60 from-20% via-black/50 via-40% to-[#010101] to-98%"></div>
          </div>
          <div className="absolute lg:inset-32 inset-10 flex items-center justify-center">
            <div className="flex flex-col items-center lg:gap-4 gap-2">
              <h1 className="lg:text-8xl text-5xl font-bold text-dm text-center opacity-90">
                {data.title}
              </h1>
              <p className="tracking-tighter lg:text-3xl text-2xl font-medium opacity-90 lg:w-96 text-center">
                {data.tagline}
              </p>
            </div>
          </div>
          <div className="absolute inset-10 flex flex-row items-end justify-center">
            <div className="flex items-center lg:gap-4 gap-2">
              <button
                type="button"
                onClick={() => setPlay(true)}
                className="bg-white/20 backdrop-blur-sm lg:p-4 p-3 rounded-full active:scale-95 transition duration-300 ease-in-out"
              >
                <PlayIcon className="lg:w-10 lg:h-10 w-8 h-8 ps-1" />
              </button>
              <h1 className="lg:text-xl text-lg font-medium tracking-tight">
                Play Movie
              </h1>
            </div>
            <Transition.Root show={play} as={Fragment}>
              <Dialog
                as="div"
                className="relative z-50"
                initialFocus={cancelButtonRef}
                onClose={setPlay}
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
                          src={`https://multiembed.mov/?video_id=${id}&tmdb=1`}
                          allowFullScreen
                        ></iframe>
                      </Dialog.Panel>
                    </Transition.Child>
                  </div>
                </div>
              </Dialog>
            </Transition.Root>
          </div>
        </section>
      ) : (
        <section className="relative h-screen animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 from-10% via-black/10 via-80% to-black/20 to-90%"></div>
        </section>
      )}
    </>
  );
}
