"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { EllipsisHorizontalIcon, PlayIcon } from "@heroicons/react/24/outline";

export default function Movie() {
  const router = useSearchParams();
  const id = router.get("id");
  const [data, setData] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [credits, setCredits] = useState(null);

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

  useEffect(() => {
    async function fetchTrailers() {
      try {
        const response = await fetch(`/api/getTrailer?id=${id}`);
        const data = await response.json();
        setTrailer(data.key);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }

    fetchTrailers();
  }, [id]);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const response = await fetch(`/api/getCredits?id=${id}`);
        const data = await response.json();
        setCredits(data.data);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }

    fetchCredits();
  }, [id]);

  const [open, setOpen] = useState(false);
  const cancelButtonRef = useRef(null);

  return (
    <>
      {data ? (
        <>
          <section className="relative grid">
            <div className="h-[30em]">
              <Image
                className="w-full h-full object-cover object-center"
                src={`https://image.tmdb.org/t/p/original${data.backdrop_path}`}
                width={5000}
                height={5000}
                alt="Latest"
                priority={true}
              />
              <div className="absolute top-0 inset-0 bg-black/30 backdrop-opacity-100 bg-gradient-to-b from-black/40 from-10% via-black/70 via-40% to-[#010101] to-90%"></div>
            </div>
            <div className="absolute lg:top-20 top-14">
              <div className="flex flex-col lg:grid grid-cols-12 w-screen items-start gap-12 text-gray-300 lg:px-16 p-6">
                <div className="relative lg:col-span-3 col-span-4 rounded-xl ring-1 ring-white/20 shadow-xl">
                  <Image
                    className="object-cover object-center rounded-xl"
                    src={`https://image.tmdb.org/t/p/original${data.poster_path}`}
                    width={5000}
                    height={5000}
                    alt="Latest"
                    priority={true}
                  />
                  <div className="absolute top-0 inset-0 bg-black/20 rounded-xl"></div>
                </div>
                <div className="col-span-7 text-white w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-x-8 font-semibold text-gray-300 lg:text-base text-sm pb-2">
                    <p className="text-green-500">
                      {Math.floor(data.vote_average * 10)}% Match
                    </p>
                    <p>{data.release_date.slice(0, 4)}</p>
                  </div>
                  <h1 className="text-4xl font-semibold tracking-tight">
                    {data.title}
                  </h1>
                  <p className="text-gray-300 lg:text-base text-base">
                    {data.overview}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 font-medium text-gray-300 lg:text-base text-sm pt-3 pb-5">
                    {data.genres.map((genre, index) => (
                      <p
                        key={index}
                        className="bg-white/20 px-3 py-1 rounded-full text-sm"
                      >
                        {genre.name}
                      </p>
                    ))}
                  </div>
                  <div className="">
                    <button
                      onClick={() => setOpen(true)}
                      className="bg-white lg:px-5 px-3 py-3 rounded-full flex items-center gap-2 tracking-tight text-gray-900 font-semibold"
                    >
                      <PlayIcon className="w-6 h-6 stroke-0 fill-gray-900" />
                      Watch Trailer
                    </button>
                  </div>
                  <div className="grid grid-cols-12 flex-row flex-wrap items-center gap-6 py-6">
                    {credits &&
                      credits.cast.slice(0, 6).map((item, index) => (
                        <div
                          key={index}
                          className="cursor-pointer lg:col-span-2 col-span-6"
                        >
                          <div className="relative text-gray-300">
                            <Image
                              className="w-full h-40 shadow shadow-white/30 object-cover object-center rounded-xl"
                              src={`https://image.tmdb.org/t/p/original${item.profile_path}`}
                              width={5000}
                              height={5000}
                              alt="Latest"
                              priority={true}
                            />
                            <div className="absolute top-0 inset-0 bg-black/40 rounded-xl"></div>
                            <h1 className="lg:absolute relative left-0 right-0 text-sm text-center py-2">
                              {item.name}
                            </h1>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
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
                        src={`https://www.youtube.com/embed/${trailer}`}
                        allowFullScreen
                      ></iframe>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition.Root>
        </>
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
