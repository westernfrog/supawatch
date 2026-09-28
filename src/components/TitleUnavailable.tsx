"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TitleUnavailable({ type }: { type: "movie" | "tv" }) {
  return <div className="title-unavailable discovery-controls"><p className="eyebrow">A brief interruption</p><h1>This title couldn’t load.</h1><p>The catalogue is taking longer than usual. Give it another try.</p><div><Button onClick={() => window.location.reload()}>Try again</Button><Button variant="outline" asChild><Link prefetch={false} href={`/${type === "movie" ? "films" : "series"}`}>Browse {type === "movie" ? "films" : "series"}</Link></Button></div></div>;
}
