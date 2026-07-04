import { cache } from "react";
import { tmdbFetch } from "@/lib/tmdb";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PersonPageHero from "@/components/PersonPageHero";
import PersonCredits from "@/components/PersonCredits";

interface Props {
  params: Promise<{ id: string }>;
}

/* Shared between generateMetadata and the page — one TMDB round trip. */
const getPerson = cache((id: string) =>
  tmdbFetch(
    `/person/${id}`,
    { append_to_response: "combined_credits,external_ids,images" },
    { revalidate: 3600 },
  ),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await getPerson(id);
    const name = p.name ?? "Person";
    const description = p.biography
      ? `${p.biography.slice(0, 155)}…`
      : `Filmography, biography, photos, and known-for titles for ${name} on Supawatch.`;
    const image = p.profile_path
      ? `https://image.tmdb.org/t/p/w780${p.profile_path}`
      : undefined;

    return {
      title: name,
      description,
      alternates: { canonical: `/person/${id}` },
      openGraph: {
        title: `${name} | Supawatch`,
        description,
        type: "profile",
        url: `/person/${id}`,
        images: image ? [{ url: image, alt: name }] : [],
      },
      twitter: {
        card: "summary",
        title: `${name} | Supawatch`,
        description,
        images: image ? [image] : [],
      },
    };
  } catch {
    return { title: "Person" };
  }
}

export default async function PersonPage({ params }: Props) {
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let person: any;

  try {
    person = await getPerson(id);
  } catch {
    notFound();
  }

  if (!person || person.success === false) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const castCredits: any[] = (person.combined_credits?.cast ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => c.media_type === "movie" || c.media_type === "tv",
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crewCredits: any[] = (person.combined_credits?.crew ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) =>
      (c.media_type === "movie" || c.media_type === "tv") &&
      [
        "Director",
        "Producer",
        "Writer",
        "Screenplay",
        "Story",
        "Creator",
        "Executive Producer",
      ].includes(c.job),
  );

  // Filmography — sorted by date desc, dedupe by id+media_type+role
  const seenFilm = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filmography: any[] = [...castCredits, ...crewCredits]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => {
      const key = `${c.id}-${c.media_type}-${c.character ?? c.job ?? ""}`;
      if (seenFilm.has(key)) return false;
      seenFilm.add(key);
      return c.poster_path != null;
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => {
      const da = a.release_date ?? a.first_air_date ?? "";
      const db = b.release_date ?? b.first_air_date ?? "";
      return db.localeCompare(da);
    });

  // Known For — top by popularity, dedupe by id+media_type
  const seenKf = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const knownFor: any[] = [...castCredits, ...crewCredits]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => c.poster_path)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => {
      const key = `${c.id}-${c.media_type}`;
      if (seenKf.has(key)) return false;
      seenKf.add(key);
      return true;
    })
    .slice(0, 10);

  // Best backdrop — highest-rated credit that has one
  const backdropPath =
    [...castCredits, ...crewCredits]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => c.backdrop_path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]
      ?.backdrop_path ?? null;

  const creditsCount = castCredits.length;

  // Years active
  const allYears = [...castCredits, ...crewCredits]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => (c.release_date ?? c.first_air_date ?? "").slice(0, 4))
    .filter((y: string) => y && !isNaN(Number(y)))
    .map(Number)
    .sort((a: number, b: number) => a - b);
  const firstYear = allYears[0] ?? null;
  const lastYear = allYears[allYears.length - 1] ?? null;
  const currentYear = new Date().getFullYear();
  const yearsActive = firstYear
    ? lastYear === currentYear
      ? `${firstYear} – Present`
      : `${firstYear} – ${lastYear}`
    : null;

  const departments = [person.known_for_department ?? "Acting"].filter(Boolean);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const knownForTitles = knownFor.slice(0, 3).map((c: any) => c.title ?? c.name ?? "");

  const extIds = person.external_ids ?? {};
  const externalLinks = [
    extIds.imdb_id
      ? { label: "IMDb", url: `https://www.imdb.com/name/${extIds.imdb_id}` }
      : null,
    extIds.instagram_id
      ? {
          label: "Instagram",
          url: `https://www.instagram.com/${extIds.instagram_id}`,
        }
      : null,
    extIds.twitter_id
      ? { label: "X / Twitter", url: `https://twitter.com/${extIds.twitter_id}` }
      : null,
  ].filter(Boolean) as { label: string; url: string }[];

  const profiles: { file_path: string }[] = person.images?.profiles ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    description: person.biography ? person.biography.slice(0, 300) : undefined,
    image: person.profile_path
      ? `https://image.tmdb.org/t/p/w780${person.profile_path}`
      : undefined,
    birthDate: person.birthday || undefined,
    deathDate: person.deathday || undefined,
    birthPlace: person.place_of_birth || undefined,
    jobTitle: person.known_for_department || undefined,
    sameAs: externalLinks.map((l) => l.url),
  };

  return (
    <div className="min-h-screen bg-[#010101] text-white">
      <JsonLd data={jsonLd} />
      <PersonPageHero
        name={person.name}
        department={person.known_for_department ?? "Acting"}
        biography={person.biography ?? ""}
        profilePath={person.profile_path ?? null}
        backdropPath={backdropPath}
        birthday={person.birthday ?? null}
        deathday={person.deathday ?? null}
        placeOfBirth={person.place_of_birth ?? null}
        creditsCount={creditsCount}
        yearsActive={yearsActive}
        departments={departments}
        knownForTitles={knownForTitles}
        externalLinks={externalLinks}
        profiles={profiles}
      />

      {/* ── CREDITS ── */}
      <PersonCredits knownFor={knownFor} filmography={filmography} />
    </div>
  );
}
