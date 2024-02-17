"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

export default function Search() {
  const router = useRouter();
  const { slug } = useParams();
  const [term, setTerm] = useState("");

  useEffect(() => {
    if (slug) {
      setTerm(slug.replace(/%20/g, " "));
    }
  }, [slug]);

  useEffect(() => {
    router.replace(`/search/${term}`);
  }, [term]);

  const handleInputChange = (e) => {
    const newTerm = e.target.value;
    setTerm(newTerm);
  };

  return (
    <>
      <section className="relative">
        <div className="lg:h-64 h-32">
          <img
            src="https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Search Backdrop"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute top-0 bg-black/30 inset-0 bg-gradient-to-b from-black/60 from-20% via-black/50 via-40% to-[#010101] to-80%"></div>
          <div className="absolute lg:inset-x-10 lg:inset-y-32 inset-x-6 inset-y-28">
            <h1 className="font-semibold lg:text-9xl text-3xl tracking-tighter lg:mb-0 mb-2">
              Search Anything..
            </h1>
            <div className="ring-1 ring-white/80 focus:ring-green-500 rounded-full flex items-center justify-between">
              <input
                type="text"
                className="peer bg-transparent border-0 lg:px-10 p-4 w-full focus:outline-0 focus:ring-0 rounded-full tracking-normal lg:text-xl placeholder:text-white/40 lg:placeholder:text-xl placeholder:text-sm placeholder:tracking-tight"
                placeholder="Search your favourite movies or tv series!"
                onChange={handleInputChange}
                value={term}
              />
              <button
                type="button"
                className="lg:p-6 p-3 bg-green-500 rounded-full lg:m-2 m-1 active:scale-95 transition duration-300 ease-in-out"
              >
                <h1 className="lg:text-lg text-sm text-black/90 font-bold">
                  Search
                </h1>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
