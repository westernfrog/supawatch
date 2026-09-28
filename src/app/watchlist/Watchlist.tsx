"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Film, Tv, Layers } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";
import { titleKey } from "@/lib/discovery";
import TitleCard from "@/components/discovery/TitleCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sections = [{ value: "all", label: "Everything", icon: Layers }, { value: "movie", label: "Films", icon: Film }, { value: "tv", label: "Series", icon: Tv }];
export default function Watchlist() {
  const list = useWatchlist();
  const [type, setType] = useState("all");
  return <div className="editorial-page discovery-controls watchlist-page">
    <header className="editorial-heading"><p className="eyebrow">Your personal screening room</p><h1>Good things.<br /><span>Kept for later.</span></h1><p>A film for tonight. A series for the weekend.<br />Your favourites, saved in this browser.</p></header>
    <Tabs value={type} onValueChange={setType}>
      <div className="watchlist-toolbar"><TabsList aria-label="Saved titles" className="min-h-12">{sections.map(({ value, label, icon: Icon }) => <TabsTrigger key={value} value={value} className="min-h-11 px-4"><Icon /><span>{label}</span><span className="tab-count">{list.filter(item => value === "all" || item.media_type === value).length}</span></TabsTrigger>)}</TabsList><span>{list.length} saved titles</span></div>
      {sections.map(({ value }) => {
        const items = list.filter(item => value === "all" || item.media_type === value);
        return <TabsContent key={value} value={value}>
          {items.length ? <div className="discovery-grid">{items.map(item => <TitleCard key={titleKey(item)} item={item} savedList />)}</div> : <div className="watchlist-empty"><Bookmark className="empty-asterisk" aria-hidden="true" strokeWidth={1} /><h2>{list.length ? `No ${value === "movie" ? "films" : "series"} saved. Yet.` : "Your next favourite belongs here."}</h2><p>Bookmark something that catches your eye. We’ll keep a seat for it.</p><Link prefetch={false} className="text-link" href="/#discover">Find something good <ArrowUpRight size={18} /></Link></div>}
        </TabsContent>;
      })}
    </Tabs>
  </div>;
}
