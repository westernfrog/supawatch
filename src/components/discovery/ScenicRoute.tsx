import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { COLLECTIONS } from "@/lib/discovery";
import { getCollection } from "@/lib/collection-data";
import BlurImage from "@/components/BlurImage";

export default async function ScenicRoute() {
  const slugs = ["after-hours", "seoul", "drawn-to-it"];
  const editions = await Promise.all(slugs.map(async slug => ({
    collection: COLLECTIONS.find(item => item.slug === slug)!,
    items: await getCollection(slug).catch(() => []),
  })));
  return <section className="scenic-route" aria-labelledby="scenic-heading">
    <div className="scenic-heading"><div><p className="eyebrow">Explore collections</p><h2 id="scenic-heading">Find a<br /><span>collection.</span></h2></div><div><p>Browse films and series grouped by genre, place, and running time.</p><Link prefetch={false} href="/collections" className="text-link">All collections <ArrowUpRight size={17} /></Link></div></div>
    <div className="scenic-editions">{editions.map(({ collection, items }) => <Link prefetch={false} href={`/collections/${collection.slug}`} key={collection.slug} className="scenic-edition">
      <div className="scenic-art">{items.slice(0, 3).map(item => <BlurImage key={item.id} src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt="" width={342} height={513} />)}{!items.length && <span>{collection.kicker}</span>}</div>
      <div className="scenic-caption"><div><p className="eyebrow">{collection.kicker}</p><h3>{collection.title.replaceAll("\n", " ")}</h3></div><ArrowUpRight size={21} aria-hidden="true" /></div>
      <p className="scenic-description">{collection.description}</p>
    </Link>)}</div>
  </section>;
}

export function ScenicSkeleton() {
  return <div className="scenic-route" aria-label="Loading collections"><p className="eyebrow">Take the scenic route</p><div className="scenic-editions" aria-hidden="true">{[0, 1, 2].map(i => <div key={i} className="scenic-art" />)}</div></div>;
}
