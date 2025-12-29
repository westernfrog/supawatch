import PersonClient from "./PersonClient";
import { generatePersonJsonLd } from "@/lib/seo";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function getPersonData(id) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/person/${id}?api_key=${TMDB_API_KEY}&language=en-US`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Error fetching person:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const person = await getPersonData(id);

  if (!person) {
    return {
      title: "Person Not Found",
      description: "The requested person could not be found.",
    };
  }

  const profileImage = person.profile_path
    ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
    : undefined;

  const department = person.known_for_department
    ? ` - ${person.known_for_department}`
    : "";

  return {
    title: person.name,
    description:
      person.biography?.slice(0, 160) ||
      `Explore ${person.name}'s filmography, biography, and more on Supawatch.`,
    openGraph: {
      title: `${person.name}${department}`,
      description:
        person.biography?.slice(0, 200) ||
        `View ${person.name}'s movies and TV shows.`,
      type: "profile",
      images: profileImage
        ? [
            {
              url: profileImage,
              width: 500,
              height: 750,
              alt: person.name,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: person.name,
      description:
        person.biography?.slice(0, 200) ||
        `Explore ${person.name}'s filmography.`,
      images: profileImage ? [profileImage] : [],
    },
  };
}

export default async function PersonPage({ params }) {
  const { id } = await params;
  const person = await getPersonData(id);
  const jsonLd = person ? generatePersonJsonLd(person) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PersonClient id={id} initialData={person} />
    </>
  );
}
