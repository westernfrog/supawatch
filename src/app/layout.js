import localFont from "next/font/local";
import {
  Inter,
  DM_Serif_Display,
  Mona_Sans,
  Open_Sans,
} from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import SmoothScroll from "./components/SmoothScroll";

const inter = Open_Sans({
  subsets: ["latin"],
  variable: "--font-inter",
});

const dm = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-dm",
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
  title: "Supawatch - Explore a cinematic universe like never before",
  description:
    "Supawatch is a movie and TV series streaming platform that allows you to explore a cinematic universe like never before. With a vast collection of movies and TV series, you can watch your favorite content anytime, anywhere.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${inter.variable} ${dm.variable} ${mdnichrome.variable}`}
      >
        <SmoothScroll>
          <Header />
          {children}
          <Footer />
          <Analytics />
        </SmoothScroll>
      </body>
    </html>
  );
}
