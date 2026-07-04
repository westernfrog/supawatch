import { CACHE, jsonFromError, jsonOk, requirePositiveInt } from "@/lib/tmdb";
import { getEnhancedMediaDetails } from "@/lib/media";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = requirePositiveInt(searchParams.get("id"), "id param");
  if (id instanceof Response) return id;

  try {
    const data = await getEnhancedMediaDetails("tv", id);
    return jsonOk(data, 200, { sMaxAge: CACHE.hour, staleWhileRevalidate: CACHE.day });
  } catch (e) {
    return jsonFromError(e);
  }
}
