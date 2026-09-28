import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import BlurImage from "@/components/BlurImage";
import { COLLECTIONS } from "@/lib/discovery";
import { getCollection } from "@/lib/collection-data";

export const revalidate = 86400;
export const metadata: Metadata = { title: "Collections", description: "Browse 20 film and series collections by genre, country, era, and running time. Preview the titles and find something to watch.", alternates: { canonical: "/collections" } };

export default async function CollectionsPage() {
  const selections = await Promise.all(COLLECTIONS.map(collection => getCollection(collection.slug).catch(() => [])));
  const opening = selections[0].slice(0, 3);
  return <div className="collection-library">
    <header className="collection-library-heading"><div><p className="eyebrow">Film & series collections</p><h1>Follow a feeling.<br /><span>Find your film.</span></h1><p>Browse by genre, place, or the time you have.<br />Take a look at the titles, then choose a collection.</p><a href="#collection-selection" className="text-link">Explore {COLLECTIONS.length} collections <ArrowDown size={16} /></a></div><div className="collection-intro-posters" aria-hidden="true">{opening.map(item => <BlurImage key={item.id} src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt="" width={228} height={342} lazy={false} />)}</div></header>
    <div className="collection-library-label"><span className="eyebrow">Find your next collection</span><span>{COLLECTIONS.length.toString().padStart(2, "0")} collections / Films & series</span></div>
    <div id="collection-selection" className="collection-library-grid">{COLLECTIONS.map((collection, index) => {
      const selection = selections[index];

      return <Link prefetch={false} className="collection-edition" href={`/collections/${collection.slug}`} key={collection.slug}>
        <div className="collection-poster-preview" aria-label="Titles in this collection">{selection.slice(0, 4).map(item => <figure key={item.id}><BlurImage src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt="" width={342} height={513} lazy={index > 1} /><figcaption>{item.title}</figcaption></figure>)}</div>
        <div className="collection-edition-copy"><div className="collection-edition-meta"><p className="eyebrow">{collection.kicker}</p><span>{selection.length} {collection.type === "tv" ? "series" : "films"}</span></div><div><h2>{collection.title.replaceAll("\n", " ")}</h2><ArrowUpRight aria-hidden="true" size={22} /></div><p>{collection.description}</p><span className="collection-open">View the collection <ArrowUpRight size={14} aria-hidden="true" /></span></div>
      </Link>;
    })}</div>
  </div>;
}
