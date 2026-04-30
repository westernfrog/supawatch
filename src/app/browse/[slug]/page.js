import MediaGrid from "@/app/components/MediaGrid";

/**
 * Dynamic "See All" page — /browse/[slug]
 *
 * Reads everything it needs from URL search params:
 *   ?api=   – API endpoint (without the &page= suffix)
 *   ?type=  – "movie" | "tv"
 *   ?link=  – link prefix, e.g. "/movie" or "/tv"
 *   ?hero=  – optional hero image URL (falls back to a default)
 *
 * The [slug] segment is the human-readable title (URL-encoded).
 * Example:
 *   /browse/Popular%20Movies?api=/api/getMovieList?list=popular&type=movie&link=/movie
 */
export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const title = decodeURIComponent(slug).replace(/-/g, " ");
  return {
    title: `${title} | Supawatch`,
    description: `Browse all ${title.toLowerCase()} on Supawatch.`,
    openGraph: {
      title: `${title} | Supawatch`,
      description: `Browse all ${title.toLowerCase()} on Supawatch.`,
    },
  };
}

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1596641532299-7cf6455a1363?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export default async function BrowsePage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;

  const title = decodeURIComponent(slug).replace(/-/g, " ");
  const apiEndpoint = sp.api ?? "/api/getMovieList?list=popular";
  const linkPrefix = sp.link ?? "/movie";
  const heroImage = sp.hero ? decodeURIComponent(sp.hero) : DEFAULT_HERO;

  return (
    <MediaGrid
      title={title}
      subtitle={`Browse all ${title.toLowerCase()}`}
      apiEndpoint={apiEndpoint}
      linkPrefix={linkPrefix}
      emptyMessage={`No more ${title.toLowerCase()}`}
      heroImage={heroImage}
    />
  );
}
