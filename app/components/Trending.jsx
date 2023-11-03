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
        <section className="p-16 text-white my-6">
          <div className="flex items-center justify-between mb-24">
            <h1 className="text-4xl font-semibold border-l-8 border-green-500 ps-4">
              Trending
            </h1>
          </div>
          <div className="grid grid-cols-12 items-center justify-between gap-10">
            {data &&
              data.results
                .slice(8, data.results.length)
                .map((item, index) => (
                  <Card
                    key={index}
                    backdrop_path={item.backdrop_path}
                    title={item.title}
                    overview={item.overview.slice(0, 92)}
                    vote_average={Math.floor(item.vote_average * 10)}
                  />
                ))}
          </div>
        </section>
      )}
    </>
  );
}
