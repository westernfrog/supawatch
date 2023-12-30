"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Card from "@/app/components/Card";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function Overview() {
  const [data, setData] = useState(null);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/getSearch?query=${term}`);
      const fetchedData = await response.json();
      setData(fetchedData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    setTerm(event.target.value);
  };

  console.log(data);

  return (
    <>
      <section className="relative mb-20">
        <div className="absolute -z-20 h-96 w-screen">
          <Image
            className="w-full h-full object-cover object-top"
            src={`https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`}
            width={1000}
            height={1000}
            alt="Search"
          />
        </div>
        <div className="absolute inset-0 lg:bg-black/20 bg-black/50 bg-gradient-to-b from-[#010101]/40 from-10% via-[#010101]/70 via-60% to-[#010101] to-80% -z-10 h-96 w-full"></div>
        <div className="text-white/90 lg:px-14 lg:pt-24 px-6 pt-20">
          <div>
            <h1 className="lg:text-9xl text-4xl font-medium tracking-tighter lg:mb-0 mb-4">
              Search any movie!
            </h1>
          </div>
          <div className="ring-1 ring-white/60 focus:ring-green-500 rounded-full flex items-center justify-between">
            <input
              type="text"
              className="peer bg-transparent border-0 lg:px-10 px-4 lg:py-4 py-2 w-full focus:outline-0 focus:ring-0 rounded-full tracking-normal text-xl placeholder:text-white/50 placeholder:italic lg:placeholder:text-lg placeholder:text-sm"
              placeholder="godzilla king of monsters.."
              value={term}
              onChange={handleInputChange}
            />
            <button
              onClick={() => handleSearch()}
              className="lg:p-6 p-3 bg-green-500 rounded-full lg:m-2 m-1 active:scale-95 transition duration-300 ease-in-out"
            >
              <h1 className="lg:text-lg text-sm text-black/90 font-bold">
                Search
              </h1>
            </button>
          </div>
        </div>
        <div className="text-white/80 lg:px-16 lg:pt-24 px-6 pt-20 w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full w-full my-10">
              <h1 className="text-white/60 italic text-sm text-center">
                searching this movie for you master...
              </h1>
            </div>
          ) : (
            <div className="grid grid-cols-12 items-center justify-between lg:gap-10 gap-6">
              {data &&
                data.results.map((item, index) => (
                  <Card
                    key={index}
                    id={item.id}
                    src={item.poster_path}
                    title={item.title}
                    overview={item.overview.slice(0, 70)}
                    release_date={item.release_date}
                    vote_average={Math.floor(item.vote_average * 10)}
                  />
                ))}
              {data && data.results.length == 0 ? (
                <div className="col-span-12 my-10">
                  <h1 className="text-white/60 italic text-sm text-center">
                    i found no movies for you master.. try searching with better
                    keywords..
                  </h1>
                </div>
              ) : (
                <div className="col-span-12 my-10 px-10">
                  <h1 className="text-white/60 italic text-sm text-center">
                    Gentlemen, welcome to Fight Club. The first rule of Fight
                    Club is: you do not talk about Fight Club. The second rule
                    of Fight Club is: you DO NOT talk about Fight Club!
                  </h1>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
