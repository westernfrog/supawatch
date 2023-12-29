"use client";

import { InformationCircleIcon, PlayIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useRouter } from "next/navigation";

export default function Overview() {
  const router = useRouter();
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

  const handleInfo = (id) => {
    router.push(`/movie?id=${id}`);
  };

  const [open, setOpen] = useState(false);
  const cancelButtonRef = useRef(null);

  const genresById = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Science Fiction",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
  };

  const getGenres = (genreIds) => {
    return genreIds.map((id) => genresById[id]);
  };

  return (
    <>
      {data &&
        data.results
          .slice(currentPage * 1, currentPage * 1 + 1)
          .map((item, index) => (
            <section
              className="relative grid h-screen items-center"
              key={index}
            >
              <div className="relative h-screen">
                <Image
                  className="w-full h-full object-cover object-center"
                  src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                  width={5000}
                  height={5000}
                  loading="lazy"
                  alt="Latest"
                />
                <div className="absolute top-0 inset-0 bg-black/20 bg-gradient-to-b lg:bg-gradient-radial from-black/40 from-10% via-black/70 via-50% to-black/90 to-90%"></div>
              </div>
              <div className="absolute bottom-16 lg:px-16 px-6">
                <div className="text-white max-w-xl space-y-4">
                  <div className="flex flex-wrap items-center gap-x-8 font-semibold text-gray-300 lg:text-base text-sm">
                    <p className="text-green-500">
                      {Math.floor(item.vote_average * 10)}% Match
                    </p>
                    <p>{item.release_date.slice(0, 4)}</p>
                  </div>
                  <h1 className="lg:text-5xl text-3xl font-bold tracking-tight text-white/90">
                    {item.title}
                  </h1>
                  <p className="text-white lg:text-lg text-base">
                    {item.overview.slice(0, 160)}..
                  </p>
                  <div className="flex flex-wrap items-center gap-2 font-medium text-gray-300 lg:text-base text-sm pt-2 pb-4">
                    {getGenres(item.genre_ids).map((genre) => (
                      <p
                        key={genre}
                        className="bg-white/20 px-3 py-1 rounded-full text-sm"
                      >
                        {genre}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center text-gray-900 font-semibold text-sm gap-4">
                    <button
                      onClick={() => setOpen(true)}
                      className="bg-white lg:px-4 px-3 py-2 rounded-full flex items-center gap-2 tracking-tight"
                    >
                      <PlayIcon className="w-5 h-5 stroke-0 fill-gray-900" />
                      Watch Trailer
                    </button>
                    <button
                      onClick={() => handleInfo(item.id)}
                      className="bg-white lg:px-4 px-3 py-2 rounded-full flex items-center gap-2 tracking-tight"
                    >
                      <InformationCircleIcon className="w-5 h-5 stroke-2" />
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
              <div className="absolute bottom-6 left-0 right-0 grid grid-flow-col justify-center lg:gap-8 gap-4 px-6">
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
