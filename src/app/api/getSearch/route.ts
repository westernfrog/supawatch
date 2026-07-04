import { CACHE, jsonErr, jsonFromError, jsonOk, sanitizePage, tmdbFetch } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  if (!query) return jsonErr("Missing query param", 400);
  if (query.length > 100) return jsonErr("Query is too long", 400);

  const includeAdult = searchParams.get("include_adult") === "true" ? "true" : "false";

  try {
    const data = await tmdbFetch(
      "/search/multi",
      { query, page: sanitizePage(searchParams.get("page")), include_adult: includeAdult },
      { revalidate: CACHE.fiveMinutes },
    );

    return jsonOk({ data }, 200, { sMaxAge: CACHE.fiveMinutes, staleWhileRevalidate: CACHE.hour });
  } catch (e) {
    return jsonFromError(e);
  }
}
