"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="title-unavailable discovery-controls">
    <p className="eyebrow">A brief interruption</p>
    <h1>This page couldn’t load.</h1>
    <p>The catalogue is temporarily unavailable. Please try again.</p>
    <div><Button onClick={reset}>Try again</Button><Button variant="outline" asChild><Link prefetch={false} href="/">Back to home</Link></Button></div>
  </div>;
}
