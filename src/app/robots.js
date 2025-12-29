export default function robots() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://supawatch.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
