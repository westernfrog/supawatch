"use client";

import Card from "./Card";
import { useState, useEffect } from "react";

export default function Trending() {
  const [data, setData] = useState(null);

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

  return (
    <>
      {data && (
        <section className="text-white lg:px-16 p-6 lg:my-10 my-6">
          <div className="flex items-center justify-between lg:mb-20 mb-6">
            <h1 className="lg:text-4xl text-xl font-semibold border-l-8 rounded border-green-500 ps-2">
              Trending
            </h1>
          </div>
          <div className="grid grid-cols-12 items-center justify-between lg:gap-6 gap-4">
            {data &&
              data.results
                .slice(8, data.results.length)
                .map((item, index) => (
                  <Card
                    key={index}
                    src={item.poster_path}
                    title={item.title}
                    overview={item.overview.slice(0, 70)}
                    release_date={item.release_date}
                    vote_average={Math.floor(item.vote_average * 10)}
                  />
                ))}
          </div>
        </section>
      )}
    </>
  );
}
