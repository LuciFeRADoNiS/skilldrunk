import type { MetadataRoute } from "next";

// Private apex (D3): nothing public to index.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
