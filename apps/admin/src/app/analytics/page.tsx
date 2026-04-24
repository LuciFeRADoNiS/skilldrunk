import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";

export const dynamic = "force-dynamic";

type TopPage = { host: string; path: string; cnt: number };

const HOST_COLOR: Record<string, string> = {
  "skilldrunk.com": "bg-orange-500",
  "www.skilldrunk.com": "bg-orange-500",
  "admin.skilldrunk.com": "bg-red-500",
  "analiz.skilldrunk.com": "bg-blue-500",
  "brief.skilldrunk.com": "bg-emerald-500",
  "quotes.skilldrunk.com": "bg-purple-500",
  "prototip.skilldrunk.com": "bg-amber-500",
  "radyo.skilldrunk.com": "bg-pink-500",
};

function color(host: string) {
  return HOST_COLOR[host] ?? "bg-neutral-500";
}

function normalizeHost(h: string | null): string {
  if (!h) return "unknown";
  return h.replace(/^www\./, "");
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysStr } = await searchParams;
  const days = Math.max(1, Math.min(30, parseInt(daysStr ?? "7") || 7));

  const { supabase, profile } = await requireAdmin("/analytics");

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [byHostRes, topPagesRes, daily] = await Promise.all([
    supabase.rpc("sd_pageviews_by_host", { p_days: days }),
    supabase.rpc("sd_pageviews_top_pages", { p_days: days, p_limit: 30 }),
    supabase
      .from("sd_pageviews")
      .select("created_at, host")
      .gte("created_at", since),
  ]);

  const byHost = (byHostRes.data ?? {}) as Record<string, number>;
  const topPages = (topPagesRes.data ?? []) as TopPage[];

  // Daily breakdown
  const dailyMap = new Map<string, number>();
  for (const row of (daily.data ?? []) as { created_at: string }[]) {
    const d = new Date(row.created_at as string).toISOString().slice(0, 10);
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
  }
  const dailyRows: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    dailyRows.push({ day: d, count: dailyMap.get(d) ?? 0 });
  }
  const dailyMax = Math.max(1, ...dailyRows.map((r) => r.count));
  const total = Object.values(byHost).reduce((s, n) => s + n, 0);
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="mt-1 text-sm text-neutral-500">
              sd_pageviews — first-party, subdomain başına host breakdown.
            </p>
          </div>
          <div className="flex gap-2">
            {[1, 7, 30].map((d) => (
              <Link
                key={d}
                href={`/analytics?days=${d}`}
                className={`rounded-md border px-3 py-1.5 text-xs font-mono ${
                  d === days
                    ? "border-orange-500 bg-orange-500/10 text-orange-400"
                    : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                {d === 1 ? "24s" : `${d}g`}
              </Link>
            ))}
          </div>
        </div>

        {/* Big number */}
        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          <Stat label={`Toplam pageview (${days}g)`} value={total} />
          <Stat label="Aktif subdomain" value={Object.keys(byHost).length} />
          <Stat
            label="Günlük ortalama"
            value={Math.round(total / Math.max(days, 1))}
          />
        </section>

        {/* Daily chart */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Günlük Trafik
          </h2>
          <div className="flex items-end gap-2 rounded-lg border border-neutral-900 bg-neutral-950 p-4">
            {dailyRows.map((r) => (
              <div
                key={r.day}
                className="flex flex-1 flex-col items-center gap-1.5"
                title={`${r.day}: ${r.count}`}
              >
                <div className="flex h-28 w-full items-end">
                  <div
                    className="w-full rounded-t bg-orange-500/70"
                    style={{
                      height: `${Math.round((r.count / dailyMax) * 100)}%`,
                      minHeight: "2px",
                    }}
                  />
                </div>
                <span className="font-mono text-[10px] tabular-nums text-neutral-400">
                  {r.count}
                </span>
                <span className="font-mono text-[9px] text-neutral-600">
                  {r.day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Host breakdown */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Subdomain Dağılımı
          </h2>
          {Object.keys(byHost).length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-900 p-8 text-center text-sm text-neutral-500">
              Henüz veri yok.
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(byHost)
                .sort(([, a], [, b]) => b - a)
                .map(([host, cnt]) => {
                  const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                  const clean = normalizeHost(host);
                  return (
                    <div
                      key={host}
                      className="rounded-md border border-neutral-900 bg-neutral-950 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${color(clean)}`}
                          />
                          {clean}
                        </span>
                        <span className="font-mono text-xs text-neutral-400">
                          {cnt.toLocaleString()} · {pct}%
                        </span>
                      </div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-900">
                        <div
                          className={`h-full ${color(clean)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* Top pages */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            En Çok Ziyaret Edilen Sayfalar
          </h2>
          {topPages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-900 p-8 text-center text-sm text-neutral-500">
              Veri yok.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-900 rounded-lg border border-neutral-900 bg-neutral-950">
              {topPages.map((p, i) => (
                <li
                  key={`${p.host}${p.path}`}
                  className="flex items-center gap-3 px-4 py-2.5 font-mono text-xs"
                >
                  <span className="w-6 text-right text-neutral-600">{i + 1}</span>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${color(normalizeHost(p.host))}`}
                  />
                  <span className="text-neutral-500">
                    {normalizeHost(p.host)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-neutral-300">
                    {p.path}
                  </span>
                  <span className="tabular-nums text-neutral-400">{p.cnt}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* GA4 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Google Analytics 4
          </h2>
          {gaId ? (
            <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-4 text-sm text-neutral-400">
              <p>
                GA4 aktif:{" "}
                <span className="font-mono text-emerald-400">{gaId}</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Cross-domain tracking (.skilldrunk.com) ile tüm subdomainler
                tek property'e gönderiyor. Detay raporlar için{" "}
                <a
                  href="https://analytics.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-400 hover:underline"
                >
                  analytics.google.com
                </a>
                .
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-900 bg-neutral-950 p-4 text-sm text-neutral-400">
              <p className="font-medium text-neutral-300">
                GA4 henüz bağlı değil.
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-neutral-500">
                <li>
                  <a
                    href="https://analytics.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-400 hover:underline"
                  >
                    analytics.google.com
                  </a>{" "}
                  → Admin → Create property
                </li>
                <li>Property adı: <code className="text-neutral-300">skilldrunk</code></li>
                <li>
                  Web stream ekle → URL:{" "}
                  <code className="text-neutral-300">https://skilldrunk.com</code>
                </li>
                <li>
                  Measurement ID kopyala (G-XXXXXXXX){" "}
                </li>
                <li>
                  Tüm 7 Vercel projesine env:{" "}
                  <code className="text-neutral-300">
                    NEXT_PUBLIC_GA_MEASUREMENT_ID
                  </code>{" "}
                  = G-XXXXXXXX
                </li>
                <li>
                  Push to main — tüm subdomainler GA4'e bağlanır (cross-domain
                  .skilldrunk.com cookie)
                </li>
              </ol>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
