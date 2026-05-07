import { requireAdmin } from "@/lib/auth";
import {
  getBotHealth,
  getRecentFailures,
  getOpenAlerts,
  getRecentRuns,
} from "@/lib/queries";
import { Shell } from "@/components/Shell";
import { Stat, StatGrid, Badge, Dot, EmptyState } from "@skilldrunk/sd-ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, "green" | "yellow" | "red" | "gray"> = {
  green: "green",
  yellow: "yellow",
  red: "red",
  unknown: "gray",
};

function relTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}sn`;
  if (s < 3600) return `${Math.floor(s / 60)}dk`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa`;
  return `${Math.floor(s / 86400)}g`;
}

export default async function DashboardPage() {
  await requireAdmin("/");
  const [bots, failures, alerts, runs] = await Promise.all([
    getBotHealth(),
    getRecentFailures(8),
    getOpenAlerts(8),
    getRecentRuns(20),
  ]);

  const greenCount = bots.filter((b) => b.status === "green").length;
  const redCount = bots.filter((b) => b.status === "red").length;
  const successRate = runs.length
    ? Math.round(
        (runs.filter((r) => r.status === "success").length / runs.length) * 100,
      )
    : null;

  return (
    <Shell currentPath="/">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h1 className="sd-h1">Dashboard</h1>
        <span
          className="sd-mono"
          style={{ fontSize: 12, color: "var(--sd-text-3)" }}
        >
          {bots.length} bot · {runs.length} run · {alerts.length} alert
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <StatGrid cols={4}>
          <Stat
            label="Bots green"
            value={`${greenCount}/${bots.length}`}
            delta={redCount > 0 ? `${redCount} red` : "all healthy"}
            tone={redCount > 0 ? "down" : "up"}
          />
          <Stat
            label="Run başarı"
            value={successRate != null ? `${successRate}%` : "—"}
            delta={runs.length > 0 ? `son ${runs.length} run` : "henüz veri yok"}
          />
          <Stat
            label="Açık alert"
            value={alerts.length}
            delta={
              alerts.filter((a) => a.level === "P0").length > 0
                ? `${alerts.filter((a) => a.level === "P0").length} P0`
                : "P0 yok"
            }
            tone={
              alerts.filter((a) => a.level === "P0").length > 0
                ? "down"
                : "up"
            }
          />
          <Stat
            label="Son fail"
            value={failures.length}
            delta={
              failures[0] ? relTime(failures[0].started_at) + " önce" : "—"
            }
            tone={failures.length > 0 ? "warn" : "up"}
          />
        </StatGrid>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <section>
          <div
            className="sd-section-label"
            style={{ marginBottom: 8, padding: "0 4px" }}
          >
            Bot Health
          </div>
          <div className="sd-card">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 0,
              }}
            >
              {bots.map((b, i) => (
                <Link
                  key={b.bot_name}
                  href={`/bots#${b.bot_name}`}
                  style={{
                    padding: "10px 12px",
                    borderRight:
                      i % 3 !== 2 ? "1px solid var(--sd-border)" : "none",
                    borderBottom:
                      i < bots.length - 3
                        ? "1px solid var(--sd-border)"
                        : "none",
                    color: "var(--sd-text)",
                    textDecoration: "none",
                    transition: "background var(--sd-tx)",
                  }}
                  className="sd-card-hover"
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 3,
                    }}
                  >
                    <Dot color={STATUS_DOT[b.status] ?? "gray"} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {b.bot_name}
                    </span>
                  </div>
                  <div
                    className="sd-mono"
                    style={{ fontSize: 11, color: "var(--sd-text-3)" }}
                  >
                    {b.last_seen ? relTime(b.last_seen) : "—"}
                    {b.ram_mb != null && ` · ${b.ram_mb}MB`}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div
            className="sd-section-label"
            style={{ marginBottom: 8, padding: "0 4px" }}
          >
            Açık Alert
          </div>
          {alerts.length === 0 ? (
            <EmptyState
              title="Açık alert yok"
              text="p0-alarm task çalıştığında P0/P1 olaylar burada görünür."
            />
          ) : (
            <div className="sd-card">
              <div style={{ padding: 0 }}>
                {alerts.map((a, i) => (
                  <div
                    key={a.id}
                    style={{
                      padding: "8px 12px",
                      borderBottom:
                        i < alerts.length - 1
                          ? "1px solid var(--sd-border)"
                          : "none",
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                    }}
                  >
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
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: "var(--sd-text)",
                      }}
                    >
                      {a.title ?? a.message?.slice(0, 60) ?? "(no title)"}
                    </span>
                    <span
                      className="sd-mono"
                      style={{
                        fontSize: 11,
                        color: "var(--sd-text-3)",
                        flexShrink: 0,
                      }}
                    >
                      {relTime(a.ts)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section>
        <div
          className="sd-section-label"
          style={{ marginBottom: 8, padding: "0 4px" }}
        >
          Son Fail Eden Tasks
        </div>
        {failures.length === 0 ? (
          <EmptyState
            title="Hiç fail eden task yok ✓"
            text="Tüm Cowork tasks başarıyla çalışıyor."
          />
        ) : (
          <div className="sd-card" style={{ overflow: "hidden" }}>
            <table className="sd-table sd-table-compact">
              <thead>
                <tr>
                  <th>Task</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 100 }}>Süre</th>
                  <th style={{ width: 110 }}>Ne zaman</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((f) => (
                  <tr key={f.id}>
                    <td className="sd-mono" style={{ fontSize: 12 }}>
                      {f.task_name}
                    </td>
                    <td>
                      <Badge
                        tone={f.status === "timeout" ? "warn" : "danger"}
                      >
                        {f.status}
                      </Badge>
                    </td>
                    <td className="sd-mono" style={{ fontSize: 12 }}>
                      {f.duration_ms ? `${f.duration_ms}ms` : "—"}
                    </td>
                    <td
                      className="sd-mono"
                      style={{ fontSize: 12, color: "var(--sd-text-3)" }}
                    >
                      {relTime(f.started_at)} önce
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  );
}
