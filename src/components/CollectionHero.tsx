import Link from "next/link";
import { ArrowDown, ArrowLeft } from "lucide-react";
import BlurImage from "@/components/BlurImage";
import AudienceRating from "@/components/AudienceRating";
import { titleKey, type DiscoveryTitle } from "@/lib/discovery";

type Props = {
  title: string;
  kicker: string;
  description: string;
  count: number;
  unit: string;
  years: string | null;
  items: DiscoveryTitle[];
};

/** The collection as a video-store shelf: every title stands spine-out, one cover pulled forward. */
export default function CollectionHero({ title, kicker, description, count, unit, years, items }: Props) {
  const [from, to] = years?.split("—") ?? [];
  return (
    <header className="collection-shelf-hero">
      <div className="collection-shelf-copy">
        <Link prefetch={false} href="/collections" className="collection-shelf-back"><ArrowLeft size={15} aria-hidden="true" />All collections</Link>
        <p className="collection-shelf-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="collection-shelf-description">{description}</p>
        <p className="collection-shelf-facts">{count} {unit}{from && to ? from === to ? `, all from ${from}` : `, from ${from} to ${to}` : ""}</p>
        <a href="#selection" className="collection-shelf-browse">Browse all {count} {unit}<ArrowDown size={16} aria-hidden="true" /></a>
      </div>

      {items.length > 0 && (
        <ul className="collection-shelf" aria-label={`Titles in ${title.replaceAll("\n", " ")}`}>
          {items.map(item => (
            <li key={titleKey(item)}>
              <Link prefetch={false} href={`/${item.media_type === "movie" ? "films" : "series"}/${item.id}`}>
                <BlurImage src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt="" width={342} height={513} lazy={false} />
                <span className="collection-shelf-spine" aria-hidden="true">{item.title}</span>
                <span className="collection-shelf-cover">
                  <span>{item.title}</span>
                  <span>{item.date && <span>{item.date.slice(0, 4)}</span>}<AudienceRating value={item.vote_average} /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
