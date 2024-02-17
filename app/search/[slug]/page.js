"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";

export default function Slug() {
  const { slug } = useParams();
  const [data, setData] = useState([]);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/getSearch?query=${slug}&page=${page}`);
      const fetchedData = await response.json();

      if (!response.ok) {
        throw new Error(fetchedData.message || "Failed to fetch data");
      }
      setData((prevData) => [...prevData, ...fetchedData.data.results]);
      setPage(page + 1);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message || "An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      setTerm(slug);
    }
  }, [slug]);

  useEffect(() => {
    const debounceFetchData = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(debounceFetchData);
  }, [term]);

  return (
    <>
      <section className="lg:px-10 lg:py-32 px-6 py-28">
        <div className="grid grid-cols-12 gap-4">
          {loading ? (
            <div className="text-center col-span-12">
              <h1 className="text-lg font-medium text-yellow-500 tracking-tight">
                Searching this keyword...
              </h1>
            </div>
          ) : error ? (
            <div className="text-center col-span-12">
              <h1 className="text-lg font-medium text-red-700 tracking-tight">
                {error}
              </h1>
            </div>
          ) : data && data?.length > 0 ? (
            data.map((item, index) => (
              <Link
                key={index}
                href={"/" + item.media_type + "/" + item.id}
                className="group lg:col-span-2 col-span-6"
              >
                <div className="relative h-full bg-white/10 rounded-lg">
                  <img
                    src={
                      item.poster_path
                        ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
                        : item.profile_path
                        ? `https://image.tmdb.org/t/p/w500/${item.profile_path}`
                        : "https://images.unsplash.com/photo-1464639351491-a172c2aa2911?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGJsYWNrJTIwYmFja2dyb3VuZHxlbnwwfHwwfHx8MA%3D%3D"
                    }
                    alt={item.id}
                    className="h-full object-cover object-center rounded-lg"
                  />
                  <div className="absolute top-0 inset-0 bg-black/40 group-hover:bg-black/80 transition duration-300 ease-in-out rounded-lg"></div>
                  <div className="absolute top-2 right-2 bg-white/10 backdrop-blur-xl backdrop-opacity-60 text-sm px-3 py-1 rounded-3xl">
                    <h1>{item.media_type}</h1>
                  </div>
                  <div className="hidden group-hover:flex transition duration-300 ease-in-out absolute z-40 inset-0 items-center justify-center rounded-lg">
                    <div className="bg-white/10 px-4 py-3 flex items-center justify-center gap-1 rounded-full backdrop-blur-xl backdrop-opacity-60">
                      <h1 className="tracking-tight font-medium text-sm">
                        {item.media_type == "movie" || item.media_type == "tv"
                          ? "Watch Now"
                          : "Know More"}
                      </h1>
                      <PlayIcon className="flex-shrink-0 w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div
              className={`text-center col-span-12 ${slug ? "block" : "hidden"}`}
            >
              <h1 className="text-lg text-yellow-500 tracking-tight font-medium">
                Nothing was found, try searching with better keywords!
              </h1>
            </div>
          )}
        </div>
      </section>
      {data && data.length > 0 && (
        <div className="flex justify-center mt-4">
          <button
            className="lg:px-8 px-3 py-3 bg-white/10 backdrop-blur rounded-full text-sm lg:text-base"
            onClick={fetchData}
          >
            More
          </button>
        </div>
      )}
    </>
  );
}
