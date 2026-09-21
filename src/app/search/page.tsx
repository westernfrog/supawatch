import { Suspense } from "react";
import type { Metadata } from "next";
import SearchClient from "./SearchClient";
import { APP_NAME } from "@/lib/app-name";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
  description:
    `Search ${APP_NAME} for films and series by title, genre, and audience filters.`,
  alternates: { canonical: "/search" },
  openGraph: {
    title: `Search | ${APP_NAME}`,
    description:
      `Search ${APP_NAME} for films and series by title, genre, and audience filters.`,
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
