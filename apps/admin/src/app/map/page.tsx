import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { EcosystemMap, type MapApp, type MapStat } from "./ecosystem-map";

export const dynamic = "force-dynamic";
export const metadata = { title: "Map · admin" };

export default async function MapPage() {
  const { supabase, profile } = await requireAdmin("/map");

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ data: apps }, { data: pageviews }, { data: events }] = await Promise.all([
    supabase
      .from("pt_apps")
      .select(
        "slug, title, tagline, category, status, url, subdomain, stack, tags, is_public, featured, description_md, github_repo, vercel_project, last_deployed_at",
      )
      .neq("status", "archived")
      .order("category"),
    supabase
      .from("sd_pageviews")
      .select("host")
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("az_events")
      .select("source, occurred_at")
      .gte("occurred_at", sevenDaysAgo),
  ]);

  // Aggregate stats
  const pvByHost = new Map<string, number>();
  for (const row of (pageviews ?? []) as { host: string | null }[]) {
    const h = (row.host ?? "unknown").replace(/^www\./, "");
    pvByHost.set(h, (pvByHost.get(h) ?? 0) + 1);
  }
  const eventsBySource = new Map<string, number>();
  for (const row of (events ?? []) as { source: string }[]) {
    eventsBySource.set(row.source, (eventsBySource.get(row.source) ?? 0) + 1);
  }

  const stats: MapStat = {
    pageviews_by_host: Object.fromEntries(pvByHost),
    events_by_source: Object.fromEntries(eventsBySource),
    pv_total: pageviews?.length ?? 0,
    events_total: events?.length ?? 0,
  };

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Site Haritası</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Ekosistemin canlı, tıklanabilir, dinamik haritası. Düğümlere
              tıkla, dokümana git, hızlı aksiyon al.
            </p>
          </div>
          <div className="flex gap-3 text-xs text-neutral-500">
            <span>
              Son 7g pageview:{" "}
              <span className="font-mono text-neutral-300">{stats.pv_total}</span>
            </span>
            <span>
              Son 7g event:{" "}
              <span className="font-mono text-neutral-300">{stats.events_total}</span>
            </span>
          </div>
        </div>

        <EcosystemMap apps={(apps ?? []) as MapApp[]} stats={stats} />
      </main>
    </>
  );
}
