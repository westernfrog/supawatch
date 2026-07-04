import { CACHE, jsonErr, jsonFromError, jsonOk, requirePositiveInt, tmdbFetch } from "@/lib/tmdb";

interface RawEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = requirePositiveInt(searchParams.get("tvId") ?? searchParams.get("id"), "tvId param");
  if (id instanceof Response) return id;

  const seasonNumber = searchParams.get("seasonNumber") ?? searchParams.get("season_number");
  if (!seasonNumber || !/^\d{1,3}$/.test(seasonNumber)) {
    return jsonErr("Invalid seasonNumber param", 400);
  }

  try {
    const data = await tmdbFetch<{ episodes?: RawEpisode[] }>(`/tv/${id}/season/${seasonNumber}`, {}, { revalidate: CACHE.hour });
    const episodes = (data.episodes ?? []).map((e) => ({
      id: e.id,
      episode_number: e.episode_number,
      name: e.name,
      overview: e.overview,
      still_path: e.still_path,
      air_date: e.air_date,
      runtime: e.runtime,
      vote_average: e.vote_average,
    }));

    return jsonOk({ episodes }, 200, { sMaxAge: CACHE.hour });
  } catch (e) {
    return jsonFromError(e);
  }
}
