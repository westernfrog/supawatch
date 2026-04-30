"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import MediaDetailDialog from "./MediaDetailDialog";

/**
 * Builds a /browse/[slug] URL that encodes everything the browse page needs.
 * The slug is the kebab-cased title; api, link params carry the rest.
 */
function buildSeeAllUrl(title, apiEndpoint, linkPrefix) {
  const slug = encodeURIComponent(title);
  // Strip any existing &page= from the endpoint so MediaGrid can append it
  const cleanApi = apiEndpoint.replace(/[&?]page=\d+/, "");
  const params = new URLSearchParams({
    api: cleanApi,
    link: linkPrefix,
  });
  return `/browse/${slug}?${params.toString()}`;
}

export default function MediaCarousel({
  title,
  apiEndpoint,
  linkPrefix,
  mediaType = "movie",
  seeAllLink, // explicit override — kept for backwards compat
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

  // Resolve the "See All" href
  const seeAllHref = hideSeeAll
    ? null
    : (seeAllLink ?? buildSeeAllUrl(title, apiEndpoint, linkPrefix));

  return (
    <>
      {data ? (
        <section className="relative">
          <div className="lg:px-10 px-6 pt-10 flex items-center justify-between">
            <h2 className="lg:text-xl text-lg tracking-tight font-bold">
              {title}
            </h2>

            {seeAllHref && (
              <Link
                href={seeAllHref}
                className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors duration-200 shrink-0 group"
              >
                <span className="font-medium">See All</span>
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>

          <div className="lg:px-10 px-6">
            <div className="flex items-center gap-4 py-3 pb-10 overflow-x-auto scrollbar-hide">
              {data.results?.slice(0, 15).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="shrink-0 cursor-pointer group"
                >
                  <div className="relative lg:h-120 h-72 bg-white/5 rounded overflow-hidden">
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
          <div className="lg:px-10 px-6 pt-10 flex items-center justify-between">
            <div className="h-6 w-40 bg-white/5 rounded animate-pulse" />
            {!hideSeeAll && (
              <div className="h-4 w-14 bg-white/5 rounded animate-pulse" />
            )}
          </div>
          <div className="lg:px-10 px-6">
            <div className="flex items-center gap-4 py-3 pb-10">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="shrink-0 lg:w-64 w-48 lg:h-96 h-72 bg-white/5 rounded-lg animate-pulse"
                />
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
