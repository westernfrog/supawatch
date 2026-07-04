import { CACHE, jsonFromError, jsonOk, tmdbFetch } from "@/lib/tmdb";

interface RawResult {
  media_type: string;
  backdrop_path: string | null;
  adult?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const window = searchParams.get("window") === "week" ? "week" : "day";

  try {
    const data = await tmdbFetch<{ results?: RawResult[] }>(`/trending/all/${window}`, {}, { revalidate: CACHE.fifteenMinutes * 2 });
    const results = (data.results ?? []).filter(
      (r) => (r.media_type === "movie" || r.media_type === "tv") && r.backdrop_path && !r.adult,
    );

    return jsonOk({ results: results.slice(0, 20) }, 200, { sMaxAge: CACHE.fifteenMinutes });
  } catch (e) {
    return jsonFromError(e);
  }
}
