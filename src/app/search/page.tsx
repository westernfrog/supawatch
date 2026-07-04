import { Suspense } from "react";
import type { Metadata } from "next";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Supawatch for movies and TV series by title, genre, and audience filters.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search | Supawatch",
    description: "Search Supawatch for movies and TV series by title, genre, and audience filters.",
    url: "/search",
  },
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchClient />
    </Suspense>
  );
}
