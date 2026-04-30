const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function fetchPopularContent() {
  try {
    const [moviesRes, tvRes] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`,
        { next: { revalidate: 86400 } } // Revalidate daily
      ),
      fetch(
        `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`,
        { next: { revalidate: 86400 } }
      ),
    ]);

    const [movies, tv] = await Promise.all([
      moviesRes.ok ? moviesRes.json() : { results: [] },
      tvRes.ok ? tvRes.json() : { results: [] },
    ]);

    return {
      movies: movies.results?.slice(0, 50) || [],
      tv: tv.results?.slice(0, 50) || [],
    };
  } catch (error) {
    console.error("Error fetching content for sitemap:", error);
    return { movies: [], tv: [] };
  }
}

export default async function sitemap() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://supawatch.vercel.app";

  // Static routes
  const routes = ["", "/search", "/genre", "/popular", "/top-rated", "/tv"];

  const genreIds = [
    28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878,
    10770, 53, 10752, 37,
  ];

  const staticRoutes = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: route === "" ? 1 : 0.8,
  }));

  const genreRoutes = genreIds.map((id) => ({
    url: `${baseUrl}/genre/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Fetch dynamic content
  const { movies, tv } = await fetchPopularContent();

  const movieRoutes = movies.map((movie) => ({
    url: `${baseUrl}/movie/${movie.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const tvRoutes = tv.map((series) => ({
    url: `${baseUrl}/tv/${series.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...genreRoutes, ...movieRoutes, ...tvRoutes];
}
