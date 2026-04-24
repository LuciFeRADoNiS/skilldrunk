import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type DashboardStats = {
  total: number;
  last_30d: number;
  last_7d: number;
  by_source: Record<string, number>;
  daily_7d: { date: string; count: number }[] | null;
  top_kinds: { kind: string; count: number }[];
};

const SOURCE_LABELS: Record<string, string> = {
  obsidian: "Obsidian",
  github: "GitHub",
  calendar: "Calendar",
  manual: "Manual",
  other: "Other",
};

export default async function DashboardPage() {
  const { supabase, user } = await requireUser("/");

  const { data } = await supabase.rpc("az_dashboard_stats");
  const stats = (data as DashboardStats) ?? {
    total: 0,
    last_30d: 0,
    last_7d: 0,
    by_source: {},
    daily_7d: [],
    top_kinds: [],
  };

  const dailyMax = Math.max(1, ...(stats.daily_7d ?? []).map((d) => d.count));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-neutral-500">
            part of skilldrunk
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Analiz</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Kişisel olay akışı — Obsidian, GitHub, takvim ve manuel girişler
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/events"
            className="rounded-md border border-neutral-800 px-3 py-1.5 hover:bg-neutral-900"
          >
            Events →
          </Link>
          <span className="text-neutral-500">
            {user.email ?? user.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Stat label="Toplam Event" value={stats.total} />
        <Stat label="Son 30 gün" value={stats.last_30d} />
        <Stat label="Son 7 gün" value={stats.last_7d} />
      </div>

      {/* Daily 7d chart */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Günlük (son 7 gün)
        </h2>
        <div className="flex items-end gap-2 rounded-lg border border-neutral-900 bg-neutral-950 p-4">
          {(stats.daily_7d ?? []).map((d) => {
            const h = Math.round((d.count / dailyMax) * 100);
            return (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="relative flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t bg-orange-500/70"
                    style={{ height: `${h}%`, minHeight: "2px" }}
                  />
                </div>
                <span className="font-mono text-xs tabular-nums text-neutral-400">
                  {d.count}
                </span>
                <span className="font-mono text-[10px] text-neutral-600">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Source breakdown */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Kaynak Dağılımı (30 gün)
          </h2>
          {Object.keys(stats.by_source).length === 0 ? (
            <p className="text-sm text-neutral-500">Henüz event yok.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.by_source)
                .sort(([, a], [, b]) => b - a)
                .map(([src, cnt]) => (
                  <div
                    key={src}
                    className="flex items-center justify-between rounded-md border border-neutral-900 bg-neutral-950 px-4 py-2"
                  >
                    <span className="text-sm">
                      {SOURCE_LABELS[src] ?? src}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">
                      {cnt}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Top kinds */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            En Çok Event Tipi (30 gün)
          </h2>
          {stats.top_kinds.length === 0 ? (
            <p className="text-sm text-neutral-500">Henüz event yok.</p>
          ) : (
            <div className="space-y-2">
              {stats.top_kinds.map((k) => (
                <div
                  key={k.kind}
                  className="flex items-center justify-between rounded-md border border-neutral-900 bg-neutral-950 px-4 py-2"
                >
                  <span className="font-mono text-xs">{k.kind}</span>
                  <span className="font-mono text-xs text-neutral-400">
                    {k.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-neutral-900 pt-6 text-xs text-neutral-600">
        <p>
          Ingest endpoint:{" "}
          <code className="rounded bg-neutral-900 px-1.5 py-0.5">
            POST https://analiz.skilldrunk.com/api/events
          </code>{" "}
          — batch insert destekli, authenticated cookie gerekir.
        </p>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
