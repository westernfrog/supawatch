"use client";

import CategoryRow from "./CategoryRow";

export default function Categories() {
  return (
    <section className="bg-[#010101] pb-20 pt-10 space-y-12">
      <CategoryRow
        title="Trending Now"
        subtitle="This Week"
        fetchUrl="/api/getTrending?window=week"
        variant="landscape"
        seeAllHref="/search"
      />
      <CategoryRow
        title="Popular Movies"
        fetchUrl="/api/getMovieList?list=popular&page=1"
        variant="portrait"
        defaultMediaType="movie"
      />
      <CategoryRow
        title="Top 10 Series"
        subtitle="Right Now"
        fetchUrl="/api/getTvList?list=top_rated"
        variant="top10"
        defaultMediaType="tv"
      />
      <CategoryRow
        title="Action & Thriller"
        fetchUrl="/api/getGenreMixed?id=28"
        variant="portrait"
        seeAllHref="/movie?genre=28"
      />
      <CategoryRow
        title="Drama"
        fetchUrl="/api/getGenreMixed?id=18"
        variant="portrait"
        seeAllHref="/movie?genre=18"
      />
    </section>
  );
}
