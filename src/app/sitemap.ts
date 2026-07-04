import type { MetadataRoute } from "next";
import { CACHE, tmdbFetch } from "@/lib/tmdb";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://supawatch.vercel.app";

type ListResult = { results?: { id: number }[] };

/* Collect ids from a set of TMDB lists, two pages each — enough to put the
   catalog's most-visited detail pages in front of crawlers without an
   unbounded sitemap. Failures fall back to whatever resolved. */
async function collectIds(endpoints: string[]): Promise<number[]> {
  const pages = endpoints.flatMap((endpoint) =>
    [1, 2].map((page) =>
      tmdbFetch<ListResult>(endpoint, { page }, { revalidate: CACHE.day }).catch(
        () => null,
      ),
    ),
  );
  const responses = await Promise.all(pages);
  const ids = new Set<number>();
  for (const res of responses) {
    for (const item of res?.results ?? []) ids.add(item.id);
  }
  return [...ids];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/movie`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/tv`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/live`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const [movieIds, tvIds] = await Promise.all([
    collectIds(["/movie/popular", "/movie/top_rated", "/movie/now_playing"]),
    collectIds(["/tv/popular", "/tv/top_rated", "/tv/on_the_air"]),
  ]);

  const movieEntries: MetadataRoute.Sitemap = movieIds.map((id) => ({
    url: `${baseUrl}/movie/${id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const tvEntries: MetadataRoute.Sitemap = tvIds.map((id) => ({
    url: `${baseUrl}/tv/${id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...movieEntries, ...tvEntries];
}
