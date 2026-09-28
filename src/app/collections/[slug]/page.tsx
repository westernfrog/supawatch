import { Suspense } from "react";
import CollectionWander from "@/components/discovery/CollectionWander";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { COLLECTIONS, titleKey } from "@/lib/discovery";
import { getCollection } from "@/lib/collection-data";
import TitleCard from "@/components/discovery/TitleCard";
import JsonLd from "@/components/JsonLd";
import CollectionHero from "@/components/CollectionHero";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 86400;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = COLLECTIONS.find(item => item.slug === slug);
  return collection ? { title: collection.title.replaceAll("\n", " "), description: collection.description, alternates: { canonical: `/collections/${slug}` } } : { title: "Collection not found" };
}
export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const index = COLLECTIONS.findIndex(item => item.slug === slug);
  if (index < 0) notFound();
  const collection = COLLECTIONS[index];
  const items = await getCollection(slug).catch(() => []);
  const years = items.map(item => Number(item.date.slice(0, 4))).filter(year => year > 0);
  const yearRange = years.length ? `${Math.min(...years)}—${Math.max(...years)}` : null;
  return <div className="collection-detail discovery-controls">
    <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: collection.title.replaceAll("\n", " "), description: collection.description, url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://supawatch.vercel.app"}/collections/${slug}`, mainEntity: { "@type": "ItemList", itemListElement: items.map((item, position) => ({ "@type": "ListItem", position: position + 1, name: item.title, url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://supawatch.vercel.app"}/${item.media_type === "movie" ? "films" : "series"}/${item.id}` })) } }} />
    <CollectionHero title={collection.title} kicker={collection.kicker} description={collection.description} count={items.length} unit={collection.type === "tv" ? "series" : "films"} years={yearRange} items={items.filter(item => item.poster_path)} />
    <section id="selection" className="collection-titles"><div className="lane-heading"><div><p className="eyebrow">The full collection</p><h2>Find your opening scene.</h2></div><span>{items.length} {collection.type === "tv" ? "series" : "films"}</span></div>
      {items.length ? <div className="discovery-grid">{items.map(item => <TitleCard key={titleKey(item)} item={item} />)}</div> : <div className="discovery-empty"><h2>This collection couldn’t load.</h2><p>This collection couldn’t load. Try again in a moment.</p><Link prefetch={false} className="text-link" href={`/collections/${slug}`}>Try again <ArrowRight size={16} /></Link></div>}
    </section>
    <Suspense fallback={<div className="collection-wander"><p className="eyebrow">Keep wandering</p><p>Finding another direction…</p></div>}><CollectionWander currentSlug={slug} /></Suspense>
  </div>;
}
