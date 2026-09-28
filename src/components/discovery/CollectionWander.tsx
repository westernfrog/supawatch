import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { COLLECTIONS } from "@/lib/discovery";
import { getCollection } from "@/lib/collection-data";
import BlurImage from "@/components/BlurImage";

export default async function CollectionWander({ currentSlug }: { currentSlug: string }) {
  const index = COLLECTIONS.findIndex(collection => collection.slug === currentSlug);
  const choices = [COLLECTIONS[(index + 1) % COLLECTIONS.length], COLLECTIONS[(index + 3) % COLLECTIONS.length]];
  const editions = await Promise.all(choices.map(async collection => ({ collection, items: await getCollection(collection.slug).catch(() => []) })));
  return <section className="collection-wander" aria-labelledby="wander-heading">
    <header><div><p className="eyebrow">Keep wandering</p><h2 id="wander-heading">Where to next?</h2></div><Link prefetch={false} href="/collections" className="text-link">All collections <ArrowUpRight size={16} /></Link></header>
    <div className="wander-options">{editions.map(({ collection, items }) => <Link prefetch={false} href={`/collections/${collection.slug}`} key={collection.slug} className="wander-option"><div className="wander-posters">{items.slice(0, 2).map(item => <BlurImage key={item.id} src={`https://image.tmdb.org/t/p/w185${item.poster_path}`} alt="" width={185} height={278} />)}</div><div className="wander-copy"><p className="eyebrow">{collection.kicker}</p><h3>{collection.title.replaceAll("\n", " ")}</h3><p>{collection.description}</p><span>Explore collection <ArrowUpRight size={15} /></span></div></Link>)}</div>
  </section>;
}
