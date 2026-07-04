import { CACHE, jsonFromError, jsonOk, requirePositiveInt, tmdbFetch } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = requirePositiveInt(searchParams.get("id"), "id param");
  if (id instanceof Response) return id;

  try {
    const data = await tmdbFetch<{ results?: unknown[] }>(`/tv/${id}/recommendations`, {}, { revalidate: CACHE.hour });
    return jsonOk({ results: (data.results ?? []).slice(0, 9) }, 200, { sMaxAge: CACHE.hour });
  } catch (e) {
    return jsonFromError(e);
  }
}
