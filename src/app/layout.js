import localFont from "next/font/local";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import LenisScroll from "./components/Lenis";
import { generateWebsiteJsonLd } from "@/lib/seo";

const open_sans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

const mdnichrome = localFont({
  src: [
    {
      path: "../../public/MDNichromeTest-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/MDNichromeTest-Black.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-mdnichrome",
});

export const metadata = {
  title: {
    default: "Supawatch - Explore Movies & TV Series Like Never Before",
    template: "%s | Supawatch",
  },
  description:
    "Discover movies and TV series on Supawatch. Explore trailers, cast information, ratings, and find your next favorite show to watch.",
  keywords: [
    "movies",
    "TV series",
    "streaming",
    "watch movies",
    "TV shows",
    "trailers",
    "film",
    "entertainment",
  ],
  authors: [{ name: "Supawatch" }],
  creator: "Supawatch",
  publisher: "Supawatch",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://supawatch.vercel.app"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Supawatch",
    title: "Supawatch - Explore Movies & TV Series Like Never Before",
    description:
      "Discover movies and TV series on Supawatch. Explore trailers, cast information, ratings, and find your next favorite show.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Supawatch - Your Ultimate Movie & TV Guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Supawatch - Explore Movies & TV Series",
    description:
      "Discover movies and TV series, explore trailers and cast info on Supawatch.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  const websiteJsonLd = generateWebsiteJsonLd();

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={`${open_sans.variable} ${mdnichrome.variable}`}>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
