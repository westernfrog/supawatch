"use client";

import { useSearchParams } from "next/navigation";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FilmIcon, PlayIcon } from "@heroicons/react/24/outline";

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
  const [play, setPlay] = useState(false);
  const cancelButtonRef = useRef(null);

  return (
    <>
      {data ? (
        <>
          <section className="relative grid">
            <div className="absolute -z-10 h-[30em] w-screen">
              <img
                className="w-full h-full object-cover object-top"
                src={
                  data.backdrop_path
                    ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
                    : "https://img.freepik.com/free-photo/gray-painted-background_53876-94041.jpg?w=996&t=st=1704003269~exp=1704003869~hmac=ddeff197f70efa603218c7a2f7fc224b40f95cfb3886a2b0ec1ab8007e35b4f5"
                }
                width={2000}
                height={2000}
                alt="Latest"
                priority={false}
              />
              <div className="absolute top-0 inset-0 backdrop-opacity-100 bg-gradient-to-b from-black/20 from-10% via-black/50 via-40% to-[#010101] to-90%"></div>
            </div>
            <div className="lg:my-20 my-16">
              <div className="flex flex-col lg:grid grid-cols-12 w-screen items-start gap-12 text-gray-300 lg:px-16 p-6">
                <div className="relative lg:col-span-3 col-span-4 rounded-xl ring-1 ring-white/20 bg-white/20 shadow-xl">
                  <img
                    className="w-full h-full object-cover object-center rounded-xl"
                    src={`https://image.tmdb.org/t/p/original${data.poster_path}`}
                    width={600}
                    height={600}
                    alt="Latest"
                    priority={true}
                  />
                  <div className="absolute top-0 inset-0 bg-black/20 rounded-xl"></div>
                </div>
                <div className="col-span-7 text-white w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-x-8 font-semibold text-gray-300 lg:text-base text-sm pb-2">
                    <p className="text-green-500">
                      {Math.floor(data.vote_average * 10)}% Rating
                    </p>
                    <p>{data.release_date.slice(0, 4)}</p>
                  </div>
                  <h1 className="text-4xl font-semibold tracking-tight">
                    {data.title}
                  </h1>
                  <p className="text-white/90 lg:text-base text-base">
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
                  <div className="lg:flex grid items-center gap-4 text-sm">
                    <button
                      onClick={() => setPlay(true)}
                      className="bg-white px-5 lg:py-3 py-2 rounded-full flex  items-center justify-center gap-2 tracking-tight text-gray-900 font-semibold"
                    >
                      <FilmIcon className="w-5 h-5 stroke-2 fill-gray-900" />
                      Play Movie
                    </button>
                    <button
                      onClick={() => setOpen(true)}
                      className="bg-white px-5 lg:py-3 py-2 rounded-full flex items-center justify-center gap-2 tracking-tight text-gray-900 font-semibold"
                    >
                      <PlayIcon className="w-5 h-5 stroke-0 fill-gray-900" />
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
                            <img
                              className="w-full h-40 ring-1 ring-white/10 object-cover object-center rounded-xl"
                              src={
                                item.profile_path
                                  ? `https://image.tmdb.org/t/p/original${item.profile_path}`
                                  : "https://img.freepik.com/free-photo/abstract-textured-backgound_1258-30567.jpg?w=740&t=st=1704003442~exp=1704004042~hmac=32bdbbf0643d0b7b3242be0ff8f52df3ed9f4fad0e72df47af0e8d46bb58a751"
                              }
                              width={100}
                              height={100}
                              alt={item.name}
                            />
                            <div className="absolute top-0 inset-0 bg-black/20 rounded-xl"></div>
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
                        src={`https://vidsrc.to/embed/movie/${id}`}
                        allowFullScreen
                      ></iframe>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition.Root>
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
        <section className="relative grid">
          <div className="absolute -z-10 h-[30em] h-screen w-screen bg-white/80">
            <div className="absolute top-0 inset-0 bg-black/30 bg-gradient-to-b from-black/40 from-10% via-black/70 via-40% to-[#010101] to-90%"></div>
          </div>
          <div className="my-20">
            <div className="flex flex-col lg:grid grid-cols-12 w-screen items-start gap-12 lg:px-16 p-6">
              <div className="relative lg:col-span-3 col-span-4 rounded-xl shadow-xl bg-white/10 h-96 lg:h-full w-full animate-pulse"></div>
              <div className="col-span-8 w-full h-full space-y-2">
                <div className="bg-white/10 h-8 lg:w-96 rounded-full shadow-xl animate-pulse"></div>
                <div className="h-8 w-52 bg-white/10 rounded-full shadow-xl animate-pulse"></div>
                <div className="h-72 w-full bg-white/10 rounded-xl shadow-xl animate-pulse"></div>
                <div className="h-8 w-52 bg-white/10 rounded-full shadow-xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
