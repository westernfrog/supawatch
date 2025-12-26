const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

export async function tmdbFetch(endpoint, params = {}, options = {}) {
  if (!TMDB_API_KEY) {
    throw new Error("TMDB API key is not configured");
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append("language", "en-US");

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TMDB_API_KEY}`,
      },
      next: {
        revalidate: options.revalidate || 3600,
        tags: options.tags || [],
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(
        `TMDB API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`TMDB API fetch error for ${endpoint}:`, error);
    throw error;
  }
}

export const CacheConfig = {
  DETAILS: { revalidate: 3600 },

  LISTS: { revalidate: 900 },

  SEARCH: { revalidate: 300 },

  STATIC: { revalidate: 86400 },
};

export function validateParams(params, required = []) {
  const missing = required.filter((key) => !params[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }
}
export function createResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export function createErrorResponse(message, status = 500) {
  return Response.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
