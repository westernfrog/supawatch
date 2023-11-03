"use client";

import { InformationCircleIcon, PlayIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";

export default function Overview() {
  const [data, setData] = useState(null);
  const [trailers, setTrailers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/getPopular");
        const fetchedData = await response.json();
        setData(fetchedData.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    async function fetchTrailers(movieId) {
      try {
        const response = await fetch(`/api/getTrailer?id=${movieId}`);
        const fetchedTrailer = await response.json();
        setTrailers((prevTrailers) => [
          ...prevTrailers,
          { id: movieId, key: fetchedTrailer.key },
        ]);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }

    if (data) {
      data.results.slice(0, 8).forEach((item) => {
        fetchTrailers(item.id);
      });
    }
  }, [data]);

  console.log(trailers);

  const totalPages = data ? Math.min(Math.ceil(data.results.length / 1), 8) : 0;

  useEffect(() => {
    const interval = setInterval(() => {
      const nextPage = (currentPage + 1) % totalPages;
      setCurrentPage(nextPage);
    }, 12000);

    return () => clearInterval(interval);
  }, [currentPage, totalPages]);

  const changePage = (page) => {
    setCurrentPage(page);
  };

  const [open, setOpen] = useState(false);
  const cancelButtonRef = useRef(null);

  return (
    <>
      {data &&
        data.results
          .slice(currentPage * 1, currentPage * 1 + 1)
          .map((item, index) => (
            <section className="grid h-screen items-center" key={index}>
              <div className="relative w-full h-screen sm:aspect-h-1 sm:aspect-w-2 lg:aspect-h-1 lg:aspect-w-1">
                <Image
                  className="w-full h-full object-cover object-center"
                  src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                  width={5000}
                  height={5000}
                  alt="Latest"
                />
                <div className="absolute top-0 inset-0 bg-black/20 bg-gradient-radial from-black/30 from-10% via-black/50 via-40% to-black/90 to-90%"></div>
              </div>
              <div className="absolute bottom-16 px-16">
                <div className="text-white max-w-xl space-y-4">
                  <div className="flex items-center gap-8 font-medium text-gray-300 pb-4">
                    <p className="text-green-500">
                      {Math.floor(item.vote_average * 10)}% Match
                    </p>
                    <p className="">{item.release_date.slice(0, 4)}</p>
                    <div className="flex items-center gap-4">
                      <p className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        Action
                      </p>
                      <p className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        Drama
                      </p>
                    </div>
                  </div>
                  <h1 className="text-5xl font-bold tracking-tighter">
                    {item.title}
                  </h1>
                  <p className="text-gray-300 text-lg pb-4">{item.overview}</p>
                  <div className="flex items-center text-gray-900 font-semibold gap-4">
                    <button
                      onClick={() => setOpen(true)}
                      className="bg-white px-4 py-2 rounded-full flex items-center gap-2 tracking-tighter"
                    >
                      <PlayIcon className="w-6 h-6 stroke-0 fill-gray-900" />
                      Watch Trailer
                    </button>
                    <button className="bg-white px-4 py-2 rounded-full flex items-center gap-2 tracking-tighter">
                      <InformationCircleIcon className="w-6 h-6 stroke-2" />
                      More Info
                    </button>
                  </div>
                </div>
              </div>
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
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                      <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                      >
                        <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white/20 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl h-[40em]">
                          <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${
                              trailers.find(
                                (trailer) =>
                                  trailer.id ===
                                  data.results[currentPage * 1]?.id
                              )?.key
                            }`}
                            allowFullScreen
                          ></iframe>
                        </Dialog.Panel>
                      </Transition.Child>
                    </div>
                  </div>
                </Dialog>
              </Transition.Root>
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    className={`rounded shadow-inner ${
                      index === currentPage ? "bg-white" : "bg-white/20"
                    }`}
                    onClick={() => changePage(index)}
                  >
                    <div className="px-2 py-1"></div>
                  </button>
                ))}
              </div>
            </section>
          ))}
    </>
  );
}
