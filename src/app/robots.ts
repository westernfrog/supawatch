import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://supawatch.vercel.app";

/* AI training and scraper crawlers walk the whole catalogue through the
   recommendation links, and every title they reach is a billed render. Search
   engines stay allowed. robots.txt is advisory; enforce with Vercel Bot Protection. */
const blockedBots = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "CCBot",
  "Bytespider",
  "PerplexityBot",
  "Amazonbot",
  "meta-externalagent",
  "FacebookBot",
  "Google-Extended",
  "Applebot-Extended",
  "cohere-ai",
  "Diffbot",
  "ImagesiftBot",
  "Omgilibot",
  "Timpibot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
  "DataForSeoBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: blockedBots, disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/stats"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
