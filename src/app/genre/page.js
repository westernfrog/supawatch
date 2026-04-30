import Image from "next/image";
import Genres from "./components/Genres";
import { GENRES } from "@/lib/genres";

export const metadata = {
  title: "Browse Genres",
  description:
    "Explore movies by genre. Find action, comedy, drama, horror, sci-fi, and more on Supawatch.",
  openGraph: {
    title: "Browse Movie Genres | Supawatch",
    description:
      "Explore movies by genre. Find action, comedy, drama, horror, sci-fi, and more.",
  },
};

export default function Genre() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="relative lg:h-72 h-64">
          <Image
            src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Genre Poster"
            fill
            priority
            sizes="100vw"
            className="object-cover object-bottom"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-[#010101]"></div>
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-transparent to-transparent"></div>
          <div className="absolute inset-0 top-0 flex items-end">
            <div className="lg:px-12 px-6 max-w-7xl">
              <h1 className="lg:text-5xl text-2xl font-semibold text-mdnichrome">
                Top Genres
              </h1>
            </div>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-16 gap-3 lg:gap-4 lg:p-10 p-4">
        {GENRES.map(({ id, name }) => (
          <Genres key={id} genre={id} name={name} />
        ))}
      </section>
    </>
  );
}
