import { cache } from "react";
import { CACHE, tmdbFetch } from "@/lib/tmdb";

export const getPerson = cache((id: string) => tmdbFetch(`/person/${id}`, {
  append_to_response: "combined_credits,external_ids,images",
}, { revalidate: CACHE.day }));
