"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Pause, Play, Search } from "lucide-react";
import StaticNoise from "@/components/StaticNoise";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_NAME_UPPERCASE } from "@/lib/app-name";

export default function SignalNotFound() {
  const [paused, setPaused] = useState(false);
  return <div data-page="404" className="signal-page" data-paused={paused}>
    <StaticNoise paused={paused} />
    <header className="signal-top"><Link href="/" className="signal-brand" aria-label={`${APP_NAME} home`}>{APP_NAME_UPPERCASE}</Link><span>CH. 404</span></header>
    <div className="signal-message"><p className="signal-frequency"><span />Transmission interrupted</p><h1>NO SIGNAL<span>404</span></h1><p>Nothing’s playing on this channel.<br />Let’s get you back to something good.</p><div className="signal-actions"><Button asChild size="lg"><Link href="/">Back to home<ArrowRight data-icon="inline-end" /></Link></Button><Button asChild variant="outline" size="lg"><Link href="/search"><Search data-icon="inline-start" />Find a title</Link></Button></div></div>
    <footer className="signal-footer"><span>Page not found / End of transmission</span><Button variant="ghost" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}{paused ? "Resume static" : "Pause static"}</Button></footer>
  </div>;
}
