import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/settings", "/auth", "/api/"],
      },
      // Explicitly welcome AI crawlers
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/admin", "/settings", "/auth"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/admin", "/settings", "/auth"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },
    ],
    sitemap: "https://skilldrunk.com/sitemap.xml",
  };
}
