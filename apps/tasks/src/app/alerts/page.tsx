import { requireAdmin } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { createServerClient } from "@skilldrunk/supabase/server";
import { Stat, StatGrid, Badge, EmptyState } from "@skilldrunk/sd-ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  // Counts (independent of filter)
  const { data: counts } = await sb
    .schema("tasks_dashboard")
    .from("alerts")
    .select("level,acked");
  const totalsByLevel = (counts ?? []).reduce<Record<string, number>>(
    (acc, a) => {
      const k = `${a.level}-${a.acked ? "acked" : "open"}`;
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <Shell currentPath="/alerts">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h1 className="sd-h1">Alerts</h1>
        <span
          className="sd-mono"
          style={{ fontSize: 12, color: "var(--sd-text-3)" }}
        >
          {alerts.length} {showAcked ? "kayıt" : "açık"} · p0-alarm task
        </span>
        <div style={{ marginLeft: "auto" }}>
          <Link
            href={showAcked ? "/alerts" : "/alerts?acked=1"}
            className="sd-btn"
          >
            {showAcked ? "Sadece açık" : "Acked dahil"}
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <StatGrid cols={4}>
          <Stat
            label="P0 açık"
            value={totalsByLevel["P0-open"] ?? 0}
            tone={(totalsByLevel["P0-open"] ?? 0) > 0 ? "down" : "up"}
          />
          <Stat
            label="P1 açık"
            value={totalsByLevel["P1-open"] ?? 0}
            tone={(totalsByLevel["P1-open"] ?? 0) > 0 ? "warn" : "up"}
          />
          <Stat label="P2 açık" value={totalsByLevel["P2-open"] ?? 0} />
          <Stat
            label="Toplam acked"
            value={
              (totalsByLevel["P0-acked"] ?? 0) +
              (totalsByLevel["P1-acked"] ?? 0) +
              (totalsByLevel["P2-acked"] ?? 0)
            }
            tone="up"
          />
        </StatGrid>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          title={showAcked ? "Hiç alert yok" : "Açık alert yok ✓"}
          text={
            showAcked
              ? "Tüm alarm geçmişi temiz."
              : "Sistem sağlıklı durumda. p0-alarm task saatte bir tarıyor."
          }
        />
      ) : (
        <div className="sd-card" style={{ overflow: "hidden" }}>
          <table className="sd-table sd-table-compact">
            <thead>
              <tr>
                <th style={{ width: 50 }}>Lvl</th>
                <th>Olay</th>
                <th style={{ width: 130 }}>Source</th>
                <th style={{ width: 110 }}>Ne zaman</th>
                <th style={{ width: 80 }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Badge
                      tone={
                        a.level === "P0"
                          ? "danger"
                          : a.level === "P1"
                            ? "warn"
                            : "info"
                      }
                    >
                      {a.level}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {a.title ?? "(no title)"}
                    </div>
                    {a.message && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--sd-text-3)",
                          marginTop: 2,
                        }}
                      >
                        {a.message.slice(0, 100)}
                      </div>
                    )}
                  </td>
                  <td className="sd-mono" style={{ fontSize: 11 }}>
                    {a.source ?? "—"}
                  </td>
                  <td
                    className="sd-mono"
                    style={{ fontSize: 11, color: "var(--sd-text-3)" }}
                  >
                    {new Date(a.ts).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    {a.acked ? (
                      <Badge tone="success">acked</Badge>
                    ) : (
                      <Badge tone="neutral">open</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
