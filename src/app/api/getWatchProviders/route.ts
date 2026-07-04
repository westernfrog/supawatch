import { resolveRegion } from "@/lib/geo";
import { CACHE, jsonFromError, jsonOk, requirePositiveInt, tmdbFetch } from "@/lib/tmdb";
import { pickProviderRegion, streamingProviders } from "@/lib/media";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = requirePositiveInt(searchParams.get("id"), "id param");
  if (id instanceof Response) return id;

  const region = resolveRegion(searchParams.get("region"));
  const mediaType = searchParams.get("media_type") === "tv" ? "tv" : "movie";

  try {
    const data = await tmdbFetch<{ results?: Record<string, unknown> }>(
      `/${mediaType}/${id}/watch/providers`,
      {},
      { revalidate: CACHE.day },
    );
    const picked = pickProviderRegion(data?.results as Parameters<typeof pickProviderRegion>[0], region);
    const providers = streamingProviders(picked.data);

    return jsonOk(
      {
        providers,
        link: picked.data?.link ?? null,
        region: picked.region,
        requestedRegion: region,
        fallback: picked.fallback,
      },
      200,
      { sMaxAge: CACHE.hour, staleWhileRevalidate: CACHE.day },
    );
  } catch (e) {
    return jsonFromError(e);
  }
}
