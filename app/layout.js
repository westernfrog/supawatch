import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Supawatch | Explore a cinematic universe like never before!",
  description:
    "Explore a cinematic universe like never before with our movie site powered by the TMDB API. Immerse yourself in a vast collection of films and discover hidden gems. With seamless integration, watch your favorite movies instantly. Your go-to destination for endless entertainment awaits discover, stream, and experience the magic of cinema today!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
