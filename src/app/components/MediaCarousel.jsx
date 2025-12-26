"use client";

import { ArrowRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback, memo } from "react";
import MediaDetailDialog from "./MediaDetailDialog";

export default function MediaCarousel({
  title,
  apiEndpoint,
  linkPrefix,
  mediaType = "movie",
  seeAllLink,
  hideSeeAll = false,
}) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(apiEndpoint);
        const fetchedData = await response.json();
        setData(fetchedData.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, [apiEndpoint]);

  const getTitle = (item) => item?.title || item?.name || "";

  const handleItemClick = useCallback((item) => {
    setSelectedItem(item);
    setOpen(true);
  }, []);

  return (
    <>
      {data ? (
        <section className="relative">
          <div className="lg:px-10 px-6 pt-10 flex items-center justify-between">
            <h2 className="lg:text-2xl text-lg font-bold">{title}</h2>
            {!hideSeeAll && (
              <Link
                href={seeAllLink || linkPrefix}
                className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100 font-medium"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>See All</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          <div className="lg:px-10 px-6">
            <div className="flex items-center gap-4 py-3 pb-10 overflow-x-auto scrollbar-hide">
              {data.results?.slice(0, 15).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="shrink-0 lg:w-64 w-48 cursor-pointer group"
                >
                  <div className="relative lg:h-96 h-72 bg-white/5 rounded-lg overflow-hidden">
                    <img
                      src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                      alt={getTitle(item)}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="relative">
          <div className="lg:px-10 px-6 pt-10">
            <div className="h-6 w-40 bg-white/5 rounded animate-pulse"></div>
          </div>
          <div className="lg:px-10 px-6">
            <div className="flex items-center gap-4 py-3 pb-10">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="shrink-0 lg:w-64 w-48 lg:h-96 h-72 bg-white/5 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </section>
      )}

      <MediaDetailDialog
        open={open}
        onOpenChange={setOpen}
        item={selectedItem}
        mediaType={mediaType}
        linkPrefix={linkPrefix}
      />
    </>
  );
}
