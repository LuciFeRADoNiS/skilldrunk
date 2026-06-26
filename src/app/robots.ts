import type { MetadataRoute } from "next";

// Private apex (D3): no public surface — disallow all crawling.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
