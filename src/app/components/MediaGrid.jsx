"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import MediaDetailDialog from "./MediaDetailDialog";

export default function MediaGrid({
  title,
  subtitle,
  apiEndpoint,
  linkPrefix,
  emptyMessage = "No more content",
  heroImage,
}) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const isTV = linkPrefix === "/tv";

  const fetchData = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiEndpoint}&page=${page}`);
      const fetchedData = await response.json();

      if (!fetchedData.data.results || fetchedData.data.results.length === 0) {
        setHasMore(false);
        return;
      }

      setData((prevData) => [...prevData, ...fetchedData.data.results]);
      setPage((prevPage) => prevPage + 1);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, apiEndpoint]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          fetchData();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchData, loading, hasMore]);

  const getTitle = (item) => item?.title || item?.name || "";

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setOpen(true);
  };

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="relative lg:h-72 h-64">
          <img
            src={heroImage || "/hero-bg.jpg"}
            alt="Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#010101] via-black/60 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 lg:px-10 px-6">
            <h1 className="lg:text-5xl text-2xl font-semibold text-mdnichrome">
              {title}
            </h1>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:px-10 px-6 py-8">
        {data.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            onClick={() => handleItemClick(item)}
            className="cursor-pointer group"
          >
            <div className="relative aspect-2/3 bg-white/5 rounded overflow-hidden">
              <img
                src={`https://image.tmdb.org/t/p/w500/${item.poster_path}`}
                alt={getTitle(item)}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        ))}
        {loading &&
          [...Array(10)].map((_, index) => (
            <div key={`skeleton-${index}`} className="animate-pulse">
              <div className="relative aspect-2/3 bg-white/5 rounded overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-white/10 via-white/5 to-transparent"></div>
              </div>
            </div>
          ))}
      </section>
      <div ref={observerTarget} className="flex justify-center py-8">
        {!hasMore && data.length > 0 && (
          <div className="px-8 py-3 bg-white/5 backdrop-blur rounded-full text-sm text-neutral-400 border border-white/10">
            {emptyMessage}
          </div>
        )}
      </div>
      <MediaDetailDialog
        open={open}
        onOpenChange={setOpen}
        item={selectedItem}
        mediaType={isTV ? "tv" : "movie"}
        linkPrefix={linkPrefix}
      />
    </>
  );
}
