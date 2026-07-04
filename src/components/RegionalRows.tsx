"use client";

import { useEffect, useState } from "react";
import MediaGrid from "@/components/MediaGrid";
import ShowReel from "@/components/ShowReel";
import { fetchJson } from "@/lib/client-api";

/* ── Regional flavor ───────────────────────────────────────────────────────
   Two rows seasoned by the visitor's country (edge geo headers via
   /api/getRegion): what's popular near them, and their region's all-time
   best. Filtering is by production origin country rather than language, so
   an Indian visitor gets Bollywood *and* Tamil/Telugu titles, a Belgian
   visitor gets Belgian films in any language, and so on.

   Deliberately just an accent — two rows, resolved client-side so the
   statically cached home page stays byte-identical for every visitor.
   US visitors see nothing extra (the default feed is already US-leaning),
   and any resolution failure simply renders nothing. */

function countryName(code: string): string | null {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? null;
  } catch {
    return null;
  }
}

export default function RegionalRows() {
  const [region, setRegion] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ region?: string }>("/api/getRegion", { ttlMs: 60 * 1000 })
      .then(({ region: r }) => {
        if (r) queueMicrotask(() => setRegion(r));
      })
      .catch(() => {});
  }, []);

  if (!region || region === "US") return null;
  const name = countryName(region);
  if (!name) return null;

  return (
    <>
      <ShowReel
        title={`Popular in ${name}`}
        subtitle="Trending Near You"
        fetchUrl={`/api/getDiscover?type=mixed&origin_country=${region}&sort_by=popularity.desc`}
      />
      <MediaGrid
        title={`${name}'s Finest`}
        subtitle="Local Legends"
        fetchUrl={`/api/getDiscover?type=mixed&origin_country=${region}&sort_by=vote_average.desc&vote_count_gte=50`}
      />
    </>
  );
}
