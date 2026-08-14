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

/* A shared link carries both the channel and the region it belongs to: the
   channel number indexes into one particular playlist, so without the region it
   would resolve to a different channel for a viewer in another country. Both
   are read here rather than on the client — the server then renders the right
   region from the start, with no hydration mismatch and no effect racing the
   geo lookup to set it. */
type SearchParams = Promise<{ ch?: string; region?: string }>;

export default async function LivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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
  const geoRegionCode =
    country && manifest.plutoCountries.includes(country) ? country : "global";

  const { ch, region } = await searchParams;

  // A region from the link only counts if we actually carry that playlist.
  const linkedRegion =
    region && manifest.regions.some((r) => r.code === region) ? region : null;

  const channelNumber = Number(ch);
  const linkedChannel =
    Number.isInteger(channelNumber) && channelNumber > 0 ? channelNumber : null;

  return (
    <LiveClient
      regions={manifest.regions}
      defaultRegionCode={linkedRegion ?? geoRegionCode}
      // A link naming a region is a deliberate choice, so geo must not override
      // it — passing a country here is what tells the client to stop refining.
      detectedCountry={linkedRegion ? linkedRegion : country}
      initialChannel={linkedChannel}
    />
  );
}
