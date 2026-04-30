import MediaGrid from "@/app/components/MediaGrid";
import { getGenreName } from "@/lib/genres";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const genreName = getGenreName(id) || "Movies";

  return {
    title: `${genreName} Movies`,
    description: `Explore the best ${genreName.toLowerCase()} movies. Find top-rated ${genreName.toLowerCase()} films to watch on Supawatch.`,
    openGraph: {
      title: `${genreName} Movies | Supawatch`,
      description: `Discover the best ${genreName.toLowerCase()} movies.`,
    },
  };
}

export default async function GenreIdPage({ params }) {
  const { id } = await params;
  const genreName = getGenreName(id) || "Movies";

  return (
    <MediaGrid
      title={`${genreName} Movies`}
      subtitle={`Explore the best ${genreName.toLowerCase()} films`}
      apiEndpoint={`/api/getMovieDiscover?genre=${id}`}
      linkPrefix="/movie"
      emptyMessage="No more movies in this genre"
      heroImage="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    />
  );
}
