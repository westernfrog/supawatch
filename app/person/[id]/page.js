"use client";

import Link from "next/link";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlayIcon, RectangleGroupIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";

export default function Person(props) {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [movieCredits, setMovieCredits] = useState(null);

  useEffect(() => {
    async function fetchPerson() {
      try {
        const response = await fetch(`/api/getPeople?id=${id}`);
        const fetchedPerson = await response.json();
        setPerson(fetchedPerson.data);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }
    fetchPerson();
  }, []);

  useEffect(() => {
    async function fetchMovieCredits() {
      try {
        const response = await fetch(`/api/getMovieCredits?id=${id}`);
        const fetchedMovieCredits = await response.json();
        setMovieCredits(fetchedMovieCredits.data);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }
    fetchMovieCredits();
  }, []);

  console.log(movieCredits);

  return (
    <>
      {person ? (
        <section className="max-w-7xl mx-auto flex items-center justify-center lg:mt-20 mt-14">
          <div className="lg:grid lg:grid-cols-12 items-start lg:p-10 p-6 gap-x-20 gap-6 w-full">
            <div className="lg:col-span-4">
              <div className="relative bg-gradient-to-b from-white/20 to-white/80 rounded-lg lg:w-full h-full">
                <img
                  src={`https://image.tmdb.org/t/p/w500/${person.profile_path}`}
                  alt="Backdrop"
                  className="w-full h-full object-contain object-center rounded-lg"
                />
                <div className="absolute top-0 bg-black/50 inset-0"></div>
              </div>
            </div>
            <div className="lg:col-span-8 space-y-4 lg:mt-0 mt-6">
              <div className="space-y-2">
                <h1 className="lg:text-4xl text-3xl font-semibold text-dm text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-yellow-700">
                  Overview
                </h1>
                <p className="lg:text-xl text-base">{person.biography}</p>
              </div>
              <div className="space-y-4 lg:py-0 py-4">
                <h1 className="lg:text-2xl text-xl font-semibold">
                  Movie Credits
                </h1>
                <div className="flex flex-row items-start gap-4 overflow-x-auto pb-6 ps-1 snap-x">
                  {movieCredits &&
                    movieCredits.cast.slice(0, 20).map((item, index) => (
                      <Link
                        key={index}
                        href={`/movie/${item.id}`}
                        className="relative group flex-shrink-0 snap-start"
                      >
                        <div className="relative rounded-lg bg-white/10">
                          <img
                            src={
                              item.poster_path
                                ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
                                : "https://images.unsplash.com/photo-1464639351491-a172c2aa2911?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGJsYWNrJTIwYmFja2dyb3VuZHxlbnwwfHwwfHx8MA%3D%3D"
                            }
                            alt={item.name}
                            className="w-full h-64 object-contain object-center rounded-lg"
                          />
                          <div className="absolute top-0 inset-0 bg-black/40 group-hover:bg-black/80 transition duration-300 ease-in-out"></div>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            </div>
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
