import Link from "next/link";
import { ArrowUpRight, Radio, Bookmark, BarChart3 } from "lucide-react";

export default function HomeDestinations() {
  return <section className="home-destinations" aria-labelledby="destinations-heading">
    <div className="home-destination-intro"><p className="eyebrow">Make yourself at home</p><h2 id="destinations-heading">There’s always<br />another way in.</h2><p>Your evening doesn’t have to start with a search.</p></div>
    <div className="home-destination-links">
      <Link prefetch={false} href="/live"><Radio aria-hidden="true" /><div><span className="eyebrow">On air</span><h3>A little channel surfing.</h3><p>Turn on the TV. Let something find you.</p></div><ArrowUpRight aria-hidden="true" /></Link>
      <Link prefetch={false} href="/watchlist"><Bookmark aria-hidden="true" /><div><span className="eyebrow">Your list</span><h3>Remember that one?</h3><p>The films and series you saved for a night like this.</p></div><ArrowUpRight aria-hidden="true" /></Link>
      <Link prefetch={false} href="/charts"><BarChart3 aria-hidden="true" /><div><span className="eyebrow">The bigger picture</span><h3>See what stands out.</h3><p>Explore cinema through the numbers.</p></div><ArrowUpRight aria-hidden="true" /></Link>
    </div>
  </section>;
}
