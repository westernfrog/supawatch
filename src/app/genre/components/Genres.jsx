"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import posthog from "posthog-js";

export default function Genres(props) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/getMovieDiscover?genre=${props.genre}&page=1`
        );
        const fetchedData = await response.json();
        const randomIndex = Math.floor(
          Math.random() * fetchedData.data.results.length
        );
        setData(fetchedData.data.results[randomIndex]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [props.genre]);

  if (loading) {
    return (
      <div className="lg:col-span-2 col-span-4 animate-pulse">
        <div className="relative rounded-lg bg-white/5 aspect-2/3 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-white/10 via-white/5 to-transparent"></div>
          <div className="absolute inset-0 bg-linear-to-t from-white/5 to-transparent animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const handleGenreClick = () => {
    // PostHog: Track genre selected
    posthog.capture("genre_selected", {
      genre_id: props.genre,
      genre_name: props.name,
    });
  };

  return (
    <Link
      href={`/genre/${props.genre}`}
      onClick={handleGenreClick}
      className="relative group lg:col-span-2 col-span-4 cursor-pointer"
    >
      <div className="relative rounded-lg overflow-hidden bg-white/5 transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-2xl">
        <img
          src={`https://image.tmdb.org/t/p/w500/${data.poster_path}`}
          alt={props.name}
          loading="lazy"
          className="w-full aspect-2/3 object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-black/40 opacity-70 group-hover:opacity-90 transition-opacity duration-300"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <h2 className="font-bold text-mdnichrome lg:text-4xl text-2xl tracking-tight text-center px-4 drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
            {props.name}
          </h2>
        </div>
        <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/0 to-white/0 group-hover:via-white/5 transition-all duration-500"></div>
      </div>
    </Link>
  );
}
