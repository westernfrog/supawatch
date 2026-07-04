import { CACHE, jsonFromError, jsonOk, requirePositiveInt, tmdbFetch } from "@/lib/tmdb";

type PersonCredit = {
  media_type?: string;
  popularity?: number;
};

type PersonCredits = {
  cast?: PersonCredit[];
  crew?: PersonCredit[];
};

type PersonImages = {
  profiles?: unknown[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = requirePositiveInt(searchParams.get("id"), "id param");
  if (id instanceof Response) return id;

  try {
    const [person, credits, images] = await Promise.all([
      tmdbFetch(`/person/${id}`, {}, { revalidate: CACHE.hour }),
      tmdbFetch<PersonCredits>(`/person/${id}/combined_credits`, {}, { revalidate: CACHE.hour }),
      tmdbFetch<PersonImages>(`/person/${id}/images`, {}, { revalidate: CACHE.day }),
    ]);

    const knownFor = [...(credits.cast ?? []), ...(credits.crew ?? [])]
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 8);

    return jsonOk(
      {
        person,
        knownFor,
        profiles: (images.profiles ?? []).slice(0, 6),
      },
      200,
      { sMaxAge: CACHE.hour, staleWhileRevalidate: CACHE.day },
    );
  } catch (e) {
    return jsonFromError(e);
  }
}
