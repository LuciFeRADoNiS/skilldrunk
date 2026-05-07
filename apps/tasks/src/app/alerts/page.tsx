import { requireAdmin } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { createServerClient } from "@skilldrunk/supabase/server";

export const dynamic = "force-dynamic";

const LEVEL_BADGE: Record<string, string> = {
  P0: "bg-rose-900/40 text-rose-300 border-rose-700/50",
  P1: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  P2: "bg-blue-900/40 text-blue-300 border-blue-700/50",
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ acked?: string }>;
}) {
  await requireAdmin("/alerts");
  const sp = await searchParams;
  const showAcked = sp.acked === "1";

  const sb = await createServerClient();
  let q = sb
    .schema("tasks_dashboard")
    .from("alerts")
    .select("*")
    .order("ts", { ascending: false })
    .limit(100);
  if (!showAcked) q = q.eq("acked", false);
  const { data } = await q;
  const alerts = data ?? [];

  return (
    <Shell>
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-neutral-500 mt-1">
            P0/P1 olaylar — p0-alarm Cowork task buraya yazıyor.
          </p>
        </div>
        <a
          href={showAcked ? "/alerts" : "/alerts?acked=1"}
          className="text-xs text-neutral-400 hover:text-neutral-100 underline"
        >
          {showAcked ? "Sadece açık" : "Acked dahil"}
        </a>
      </div>

      {alerts.length === 0 ? (
        <div className="border border-neutral-800 rounded-lg p-8 text-center text-neutral-500">
          {showAcked ? "Hiç alert yok." : "Açık alert yok ✓"}
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="border border-neutral-800 rounded-lg px-4 py-3 bg-neutral-900/40"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`inline-block border rounded px-2 py-0.5 text-xs font-mono ${
                    LEVEL_BADGE[a.level] ?? "border-neutral-700"
                  }`}
                >
                  {a.level}
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  {new Date(a.ts).toLocaleString("tr-TR")}
                </span>
                {a.acked && (
                  <span className="text-xs text-emerald-400">
                    ✓ acked{" "}
                    {a.acked_at
                      ? new Date(a.acked_at).toLocaleString("tr-TR")
                      : ""}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <div className="font-medium">{a.title ?? "(no title)"}</div>
                {a.message && (
                  <div className="text-sm text-neutral-400 mt-1">
                    {a.message}
                  </div>
                )}
                {a.source && (
                  <div className="text-xs text-neutral-500 mt-1 font-mono">
                    source: {a.source}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
