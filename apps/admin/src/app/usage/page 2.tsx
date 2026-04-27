import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";

export const dynamic = "force-dynamic";

type Stats = {
  total_calls: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  errors: number;
  by_app: Record<
    string,
    { calls: number; cost_usd: number; input_tokens: number; output_tokens: number }
  >;
  by_model: Record<string, { calls: number; cost_usd: number }>;
  daily: { date: string; calls: number; cost_usd: number }[] | null;
};

const APP_COLOR: Record<string, string> = {
  brief: "bg-emerald-500",
  quotes: "bg-purple-500",
  "admin-ai": "bg-orange-500",
  "marketplace-find": "bg-blue-500",
};

const fmt = (n: number, digits = 0) =>
  Number(n).toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const fmtUsd = (n: number) =>
  "$" +
  Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysStr } = await searchParams;
  const days = Math.max(1, Math.min(90, parseInt(daysStr ?? "30") || 30));

  const { supabase, profile } = await requireAdmin("/usage");

  const [{ data }, { data: recent }] = await Promise.all([
    supabase.rpc("sd_ai_usage_stats", { p_days: days }),
    supabase
      .from("sd_ai_usage")
      .select(
        "id, app, route, model, input_tokens, output_tokens, cost_usd, status, error_message, duration_ms, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const stats = (data as Stats) ?? ({} as Stats);
  const dailyMax = Math.max(
    1,
    ...((stats.daily ?? []).map((d) => d.calls) || [1]),
  );

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">AI Usage</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Anthropic API çağrıları — sd_ai_usage tablosundan canlı veri.
            </p>
          </div>
          <div className="flex gap-2">
            {[1, 7, 30, 90].map((d) => (
              <Link
                key={d}
                href={`/usage?days=${d}`}
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

        <section className="mb-8 grid gap-3 sm:grid-cols-4">
          <Stat
            label={`Toplam çağrı (${days}g)`}
            value={fmt(stats.total_calls ?? 0)}
          />
          <Stat
            label={`Toplam maliyet`}
            value={fmtUsd(stats.total_cost_usd ?? 0)}
            primary
          />
          <Stat
            label="Input tokens"
            value={fmt(stats.total_input_tokens ?? 0)}
          />
          <Stat
            label="Output tokens"
            value={fmt(stats.total_output_tokens ?? 0)}
          />
        </section>

        {/* Daily chart */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Günlük Çağrı Sayısı
          </h2>
          {!stats.daily || stats.daily.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-900 p-12 text-center text-sm text-neutral-500">
              Henüz veri yok.
            </div>
          ) : (
            <div className="flex items-end gap-2 rounded-lg border border-neutral-900 bg-neutral-950 p-4">
              {stats.daily.map((d) => (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center gap-1.5"
                  title={`${d.date}: ${d.calls} çağrı, ${fmtUsd(d.cost_usd)}`}
                >
                  <div className="flex h-28 w-full items-end">
                    <div
                      className="w-full rounded-t bg-orange-500/70"
                      style={{
                        height: `${Math.round((d.calls / dailyMax) * 100)}%`,
                        minHeight: "2px",
                      }}
                    />
                  </div>
                  <span className="font-mono text-[10px] tabular-nums text-neutral-400">
                    {d.calls}
                  </span>
                  <span className="font-mono text-[9px] text-neutral-600">
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Per-app breakdown */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            App Bazında
          </h2>
          {Object.keys(stats.by_app ?? {}).length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-900 p-8 text-center text-sm text-neutral-500">
              Veri yok.
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.by_app)
                .sort(([, a], [, b]) => b.cost_usd - a.cost_usd)
                .map(([app, agg]) => {
                  const pct =
                    stats.total_cost_usd > 0
                      ? (agg.cost_usd / stats.total_cost_usd) * 100
                      : 0;
                  return (
                    <div
                      key={app}
                      className="rounded-md border border-neutral-900 bg-neutral-950 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${APP_COLOR[app] ?? "bg-neutral-500"}`}
                          />
                          <span className="font-mono">{app}</span>
                        </span>
                        <span className="font-mono text-xs text-neutral-400">
                          {agg.calls} çağrı · {fmt(agg.input_tokens)}↓ {fmt(agg.output_tokens)}↑ ·{" "}
                          <span className="text-neutral-200">
                            {fmtUsd(agg.cost_usd)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-900">
                        <div
                          className={`h-full ${APP_COLOR[app] ?? "bg-neutral-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* Per-model */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Model Bazında
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(stats.by_model ?? {})
              .sort(([, a], [, b]) => b.cost_usd - a.cost_usd)
              .map(([model, agg]) => (
                <div
                  key={model}
                  className="flex items-center justify-between rounded-md border border-neutral-900 bg-neutral-950 p-3"
                >
                  <span className="font-mono text-xs">{model}</span>
                  <span className="font-mono text-xs text-neutral-400">
                    {agg.calls}× · {fmtUsd(agg.cost_usd)}
                  </span>
                </div>
              ))}
          </div>
        </section>

        {/* Recent calls */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Son 20 Çağrı
          </h2>
          <div className="overflow-x-auto rounded-lg border border-neutral-900">
            <table className="w-full text-xs">
              <thead className="bg-neutral-950 text-left text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Zaman</th>
                  <th className="px-3 py-2">App</th>
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2 text-right">In</th>
                  <th className="px-3 py-2 text-right">Out</th>
                  <th className="px-3 py-2 text-right">USD</th>
                  <th className="px-3 py-2 text-right">ms</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 font-mono">
                {(recent ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-1.5 text-neutral-500">
                      {new Date(r.created_at as string).toLocaleString("tr-TR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${APP_COLOR[r.app as string] ?? "bg-neutral-500"}`}
                        />
                        {r.app}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-neutral-500">{r.route}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.input_tokens as number)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.output_tokens as number)}</td>
                    <td className="px-3 py-1.5 text-right text-neutral-300">
                      {fmtUsd(r.cost_usd as number)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-neutral-500">
                      {r.duration_ms ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={
                          r.status === "ok"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {r.status as string}
                      </span>
                    </td>
                  </tr>
                ))}
                {(recent ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-neutral-500"
                    >
                      Henüz hiç çağrı kaydı yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  primary,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${primary ? "border-orange-700 bg-orange-500/5" : "border-neutral-900 bg-neutral-950"}`}
    >
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${primary ? "text-orange-300" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
