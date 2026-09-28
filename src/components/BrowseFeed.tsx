import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import BrowseSelection, { SavedBrowseShelf } from "@/components/BrowseSelection";
import CinemaShelf from "@/components/CinemaShelf";
import PillChoice from "@/components/PillChoice";
import TopSix from "@/components/TopSix";
import { GENRE_LIST, TV_GENRE_LIST, GENRE_NAMES } from "@/lib/genres";

export default function BrowseFeed({ mediaType, genre }: { mediaType: "movie" | "tv"; genre?: string }) {
  const film = mediaType === "movie";
  const genreName = genre?.split(",").map(id => GENRE_NAMES[id] ?? "Genre").join(" + ");
  const discover = (params: Record<string, string | number> = {}) => `/api/getDiscover?${new URLSearchParams({ type: mediaType, sort_by: "popularity.desc", vote_count_gte: "100", ...(genre ? { with_genres: genre } : {}), ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])) })}`;
  const genres = (film ? GENRE_LIST : TV_GENRE_LIST).filter(item => !["10763", "10766", "10767"].includes(item.id)).map(item => ({ label: item.name, url: discover({ with_genres: item.id }) }));
  const decades = [1980, 1990, 2000, 2010].map(year => ({ label: `${year}s`, url: discover({ year_from: year, year_to: year + 9, sort_by: "vote_average.desc", vote_count_gte: film ? 500 : 200 }) }));
  const languages = [["hi", "Hindi"], ["ko", "Korean"], ["ja", "Japanese"], ["fr", "French"], ["es", "Spanish"], ["ta", "Tamil"], ["te", "Telugu"], ["ml", "Malayalam"], ["de", "German"]].map(([code, label]) => ({ label, url: discover({ language: code }) }));
  const networks = [["49", "HBO"], ["213", "Netflix"], ["2552", "Apple TV+"], ["1024", "Prime Video"]].map(([code, label]) => ({ label, url: discover({ with_networks: code }) }));
  const favourites = [
    { label: "Audience favourites", url: discover({ sort_by: "vote_count.desc", vote_average_gte: 7 }) },
    { label: "Highest rated", url: discover({ sort_by: "vote_average.desc", vote_count_gte: film ? 1000 : 300 }) },
    ...(film ? [{ label: "Box office hits", url: discover({ sort_by: "revenue.desc", vote_count_gte: 500 }) }] : []),
  ];
  const extraShelves = film ? [
    { id: "crime-films", collection: "after-hours", title: "Nobody's hands are clean.", subtitle: "Investigations and close calls", genres: "80,53", variant: "stories" as const },
    { id: "animated-films", collection: "drawn-to-it", title: "Drawn, frame by frame.", subtitle: "Hand-drawn, stop-motion, and beyond", genres: "16", variant: "posters" as const },
    { id: "documentary-films", collection: "documentary-nights", title: "This actually happened.", subtitle: "People, places, and real events", genres: "99", variant: "stories" as const },
    { id: "music-films", collection: "musical-evenings", title: "Turn it all the way up.", subtitle: "Performances and the lives behind them", genres: "10402", variant: "posters" as const },
  ] : [
    { id: "mystery-series", collection: "mystery-series", title: "Somebody knows something.", subtitle: "Mysteries one episode at a time", genres: "9648", variant: "stories" as const },
    { id: "comedy-series", collection: "comedy-series", title: "Laugh track optional.", subtitle: "Comedies for an evening in", genres: "35", variant: "posters" as const },
    { id: "scifi-series", collection: "tv-global", title: "Somewhere far from here.", subtitle: "Science fiction and fantasy series", genres: "10765", variant: "stories" as const },
    { id: "documentary-series", collection: "tv-global", title: "The long version.", subtitle: "Documentary series that look closer", genres: "99", variant: "posters" as const },
  ];
  const extraShelf = (shelf: typeof extraShelves[number]) => <CinemaShelf key={shelf.id} id={shelf.id} title={shelf.title} subtitle={shelf.subtitle} fallbackCollection={shelf.collection} mediaType={mediaType} variant={shelf.variant} limit={shelf.variant === "stories" ? 9 : 12} fetchUrl={discover({ with_genres: [...new Set([...(genre?.split(",") ?? []), ...shelf.genres.split(",")])].join(","), vote_average_gte: 7, vote_count_gte: 50 })} />;
  const firstUrl = genre ? discover() : film ? "/api/getMovieList?list=now_playing" : "/api/getTvList?list=on_the_air";
  return <div className="browse-feed discovery-controls">
    <header className="browse-feed-intro"><div><p className="eyebrow">Browse the catalogue</p><h2>{genreName || (film ? "Films" : "Series")}</h2></div><Link prefetch={false} href="/watchlist" className="text-link">My List <ArrowUpRight size={16} /></Link></header>
    <BrowseSelection key={`${mediaType}:${genre ?? "all"}`} mediaType={mediaType} genre={genre} />
    <SavedBrowseShelf mediaType={mediaType} />

    <CinemaShelf id="tonight" title={genreName ? `${genreName}, right now.` : film ? "Now on the big screen." : "Everyone's talking about it."} subtitle="In the conversation" fetchUrl={firstUrl} mediaType={mediaType} />
    <PillChoice id="standouts" kicker="This is your last chance" description={film ? "Two films under 105 minutes. One keeps you comfortable, one takes you down the rabbit hole." : "Two series worth the long haul. One keeps you comfortable, one takes you down the rabbit hole."} fetchUrl={film ? discover({ with_runtime_gte: 60, with_runtime_lte: 105, vote_average_gte: 7, sort_by: "vote_average.desc", vote_count_gte: 500 }) : discover({ vote_average_gte: 8, vote_count_gte: 1000, sort_by: "vote_average.desc" })} mediaType={mediaType} limit={12} />
    <TopSix mediaType={mediaType} genreIds={genre ? [genre] : undefined} />

    <CinemaShelf title={film && !genre ? "Coming to a screen near you." : "A new story starts here."} subtitle="Next on your radar" fetchUrl={film && !genre ? "/api/getMovieList?list=upcoming" : discover({ year_from: new Date().getUTCFullYear() - 1, year_to: new Date().getUTCFullYear(), sort_by: film ? "primary_release_date.desc" : "first_air_date.desc", vote_count_gte: 50 })} mediaType={mediaType} />
    {!genre && <CinemaShelf title="Follow a feeling." subtitle="Pick your mood" mediaType={mediaType} selections={genres} selectionLabel="Shelf genre" fetchUrl={genres[0].url} />}
    {extraShelves.slice(0, 2).map(extraShelf)}
    <CinemaShelf id="familiar-favourites" title={film ? "Some things only get better." : "A name you come back to."} subtitle={film ? "From another era" : "The network selection"} mediaType={mediaType} selections={film ? decades : networks} selectionLabel={film ? "Release decade" : "TV network"} fetchUrl={film ? decades[1].url : networks[0].url} />
    <CinemaShelf title="The ones everyone remembers." subtitle="Shared favourites" mediaType={mediaType} selections={favourites} selectionLabel="Audience selection" fetchUrl={favourites[0].url} />
    <CinemaShelf id="world-stories" title="Good stories travel." subtitle="Across borders" mediaType={mediaType} selections={languages} selectionLabel="Original language" fetchUrl={film ? languages[0].url : languages[1].url} variant="stories" limit={9} />
    {extraShelves.slice(2).map(extraShelf)}
  </div>;
}
