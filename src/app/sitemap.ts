import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://skilldrunk.com";
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/feed`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/arena`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/arena/leaderboard`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/search`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/docs`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/docs/api`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/docs/mcp`, changeFrequency: "weekly", priority: 0.6 },
  ];

  // Published skills
  const { data: skills } = await supabase
    .from("sd_skills")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  const skillPages: MetadataRoute.Sitemap = (skills ?? []).map((s) => ({
    url: `${base}/s/${s.slug}`,
    lastModified: s.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // User profiles
  const { data: profiles } = await supabase
    .from("sd_profiles")
    .select("username, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  const profilePages: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `${base}/u/${p.username}`,
    lastModified: p.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...skillPages, ...profilePages];
}
