import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import IntroSplash from "@/components/IntroSplash";
import JsonLd from "@/components/JsonLd";

const mdNichrome = localFont({
  src: [
    {
      path: "../../public/MDNichromeTest-Bold.otf",
      weight: "700 900",
      style: "normal",
    },
  ],
  variable: "--font-mdnichrome",
  display: "swap",
});

const ronzino = localFont({
  src: [
    { path: "../../public/ronzino-main/fonts/Ronzino-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/ronzino-main/fonts/Ronzino-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/ronzino-main/fonts/Ronzino-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../public/ronzino-main/fonts/Ronzino-Oblique.woff2", weight: "400", style: "italic" },
    { path: "../../public/ronzino-main/fonts/Ronzino-MediumOblique.woff2", weight: "500", style: "italic" },
    { path: "../../public/ronzino-main/fonts/Ronzino-BoldOblique.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-manrope",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#010101",
};

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://supawatch.vercel.app";
const siteDescription =
  "Discover movies and TV series on Supawatch. Explore trailers, cast information, ratings, recommendations, and live channels in one cinematic watch guide.";

export const metadata: Metadata = {
  title: {
    default: "Supawatch - Movies, TV Series, Trailers & Live Channels",
    template: "%s | Supawatch",
  },
  description: siteDescription,
  keywords: ["movies", "TV series", "streaming", "trailers", "cast", "ratings", "live TV"],
  authors: [{ name: "Supawatch" }],
  creator: "Supawatch",
  applicationName: "Supawatch",
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Supawatch",
    title: "Supawatch - Movies, TV Series, Trailers & Live Channels",
    description: siteDescription,
    images: [{ url: "/images/space_odyssey_bg.png", alt: "Supawatch" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Supawatch - Movies, TV Series, Trailers & Live Channels",
    description: siteDescription,
    images: ["/images/space_odyssey_bg.png"],
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Supawatch",
  url: siteUrl,
  description: siteDescription,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${mdNichrome.variable} ${ronzino.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Every poster/backdrop comes from TMDB — warm the connection early */}
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <JsonLd data={siteJsonLd} />
      </head>
      <body className="flex min-h-screen flex-col">
        <IntroSplash />
        <Header />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
