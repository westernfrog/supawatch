import fs from "fs";
import type { Metadata } from "next";
import path from "path";
import { headers } from "next/headers";
import { countryFromHeaders } from "@/lib/geo";
import LiveClient from "./LiveClient";

export const metadata: Metadata = {
  title: "Live Channels",
  description: "Watch curated live channels by region on Supawatch, including news, movies, sports, entertainment, kids, music, and more.",
  alternates: { canonical: "/live" },
  openGraph: {
    title: "Live Channels | Supawatch",
    description: "Watch curated live channels by region on Supawatch, including news, movies, sports, entertainment, kids, music, and more.",
    url: "/live",
  },
};

// Reads request geo headers, so render per-request.
export const dynamic = "force-dynamic";

interface Region {
  code: string;
  label: string;
  file: string;
  lang: string;
}
interface Manifest {
  plutoCountries: string[];
  regions: Region[];
}

export default async function LivePage() {
  const manifestPath = path.join(
    process.cwd(),
    "public",
    "playlists",
    "regions",
    "regions.json",
  );
  let manifest: Manifest = { plutoCountries: [], regions: [] };
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  } catch (err) {
    console.error("Failed to read regions manifest:", err);
  }

  // Detect country from edge headers (Vercel/Cloudflare). null in local dev —
  // the client then refines via /api/getRegion (which has an IP fallback).
  const country = countryFromHeaders(await headers());

  // A Pluto-supported country gets its own feed; everyone else gets the
  // work-anywhere "Global / India" list (safe default, plays everywhere).
  const defaultRegionCode =
    country && manifest.plutoCountries.includes(country) ? country : "global";

  return (
    <LiveClient
      regions={manifest.regions}
      defaultRegionCode={defaultRegionCode}
      detectedCountry={country}
    />
  );
}
