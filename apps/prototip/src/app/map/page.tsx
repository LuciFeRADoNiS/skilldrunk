import Link from "next/link";
import { createAnonClient } from "@/lib/supabase";
import { PublicMap, type MapApp } from "./public-map";

export const dynamic = "force-dynamic";
export const revalidate = 600; // 10 min ISR

export const metadata = {
  title: "Ekosistem Haritası — skilldrunk",
  description:
    "skilldrunk.com altındaki tüm subdomainler, dış servisler ve aralarındaki veri/auth/API akışları — public, gezilebilir.",
  openGraph: {
    title: "skilldrunk Ekosistem Haritası",
    description:
      "9 subdomain + Supabase + Anthropic + Vercel — interaktif harita.",
  },
};

export default async function PublicMapPage() {
  const supabase = createAnonClient();
  const { data: apps } = await supabase
    .from("pt_apps")
    .select(
      "slug, title, tagline, category, status, url, subdomain, stack, tags, is_public, featured, github_repo",
    )
    .eq("is_public", true)
    .neq("status", "archived")
    .order("category");

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ekosistem Haritası</h1>
          <p className="mt-1 text-sm text-neutral-500">
            skilldrunk.com altındaki public subdomainler, paylaşılan altyapı ve
            aralarındaki bağlantılar. Düğümlere tıkla, aç, gez. Çift tıkla → alt
            sayfalar açılır.
          </p>
        </div>
        <div className="flex gap-3 text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-300">
            ← Tüm projeler
          </Link>
        </div>
      </div>

      <PublicMap apps={(apps ?? []) as MapApp[]} />
    </main>
  );
}
