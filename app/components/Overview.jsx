"use client";

import { PlayIcon, RectangleGroupIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";

export default function Overview() {
  const [data, setData] = useState(null);
  const [trailers, setTrailers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/getMovieList?list=popular&page=1");
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

  const totalPages = data
    ? Math.min(Math.ceil(data.results?.length / 1), 8)
    : 0;

  useEffect(() => {
    const interval = setInterval(() => {
      const nextPage = (currentPage + 1) % totalPages;
      setCurrentPage(nextPage);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentPage, totalPages]);

  const changePage = (page) => {
    setCurrentPage(page);
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
    return genreIds.map((id) => ({ id, name: genresById[id] }));
  };

  return (
    <>
      {data ? (
        data &&
        data.results
          .slice(currentPage * 1, currentPage * 1 + 1)
          .map((item, index) => (
            <main key={index} className="relative">
              <section className="absolute top-0 inset-0">
                <div className="relative lg:h-full">
                  <img
                    src={`https://image.tmdb.org/t/p/original/${item.backdrop_path}`}
                    alt="Backdrop"
                    className="w-full h-full lg:object-cover object-contain object-top"
                  />
                  <div className="absolute top-0 inset-0 lg:bg-black/30 bg-gradient-to-b from-black/60 from-20% via-black/50 via-40% to-[#010101] to-100%"></div>
                </div>
              </section>
              <section className="h-screen">
                <div className="absolute z-30 lg:inset-10 inset-6 flex items-end py-6">
                  <div className="lg:space-y-6 space-y-4 lg:w-[550px]">
                    <h1 className="lg:text-6xl text-4xl font-semibold text-dm tracking-wide">
                      {item.title}
                    </h1>
                    <div className="flex flex-wrap items-center lg:gap-4 gap-2">
                      {getGenres(item.genre_ids).map((genre) => (
                        <Link
                          key={genre.id}
                          href={`/genre/${genre.id}`}
                          className="lg:px-4 px-3 py-2 bg-white/10 font-medium backdrop-blur rounded-full lg:text-base text-sm"
                        >
                          {genre.name}
                        </Link>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-16 font-semibold lg:text-base text-sm">
                      <p className="text-green-500">
                        {Math.floor(item.vote_average * 10)}% Rating
                      </p>
                      <p>{item.release_date.slice(0, 4)}</p>
                    </div>
                    <p className="text-neutral-300 text-base lg:text-lg">
                      {item.overview.slice(0, 150)}..
                    </p>
                    <div className="flex lg:flex-row flex-col items-center lg:gap-4 gap-3 pb-4">
                      <button
                        onClick={() => setOpen(true)}
                        className="lg:px-6 p-4 lg:text-base text-sm bg-neutral-300 rounded-full text-neutral-900 tracking-tight font-semibold flex items-center justify-center gap-2 w-full"
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
                      <Link
                        href={`/movie/${item.id}`}
                        className="lg:px-6 p-4 lg:text-base text-sm backdrop-blur bg-white/10 font-semibold rounded-full tracking-tight flex items-center justify-center gap-2 w-full"
                      >
                        <span>More Details</span>
                        <RectangleGroupIcon className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-x-0 lg:bottom-10 bottom-6 grid grid-flow-col justify-center lg:gap-6 gap-4 px-6">
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
            </main>
          ))
      ) : (
        <main className="relative h-screen animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 from-10% via-black/10 via-80% to-black/20 to-90%"></div>
        </main>
      )}
    </>
  );
}
