/**
 * TMDB API Client - Centralized utility for all TMDB API calls
 * Uses Next.js 16 best practices with proper caching and error handling
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

/**
 * Fetch data from TMDB API with proper error handling and caching
 * @param {string} endpoint - API endpoint (e.g., '/movie/popular')
 * @param {Object} params - Query parameters
 * @param {Object} options - Fetch options including cache strategy
 * @returns {Promise<Object>} - API response data
 */
export async function tmdbFetch(endpoint, params = {}, options = {}) {
  // Validate API key
  if (!TMDB_API_KEY) {
    throw new Error("TMDB API key is not configured");
  }

  // Build URL with query parameters
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
      // Next.js 16 caching - revalidate after 1 hour
      next: {
        revalidate: options.revalidate || 3600,
        tags: options.tags || [],
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`TMDB API fetch error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Common cache configurations for different data types
 */
export const CacheConfig = {
  // Movie/TV details - cache for 1 hour
  DETAILS: { revalidate: 3600 },
  
  // Lists (popular, top_rated) - cache for 15 minutes
  LISTS: { revalidate: 900 },
  
  // Search results - cache for 5 minutes
  SEARCH: { revalidate: 300 },
  
  // Static data (genres) - cache for 1 day
  STATIC: { revalidate: 86400 },
};

/**
 * Validate required parameters
 * @param {Object} params - Parameters to validate
 * @param {Array<string>} required - Required parameter names
 * @throws {Error} - If validation fails
 */
export function validateParams(params, required = []) {
  const missing = required.filter(key => !params[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }
}

/**
 * Create standardized API response
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response} - Next.js Response object
 */
export function createResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

/**
 * Create error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} - Next.js Response object
 */
export function createErrorResponse(message, status = 500) {
  return Response.json(
    { 
      error: message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
