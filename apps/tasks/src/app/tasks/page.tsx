import { requireAdmin } from "@/lib/auth";
import { getRecentRuns } from "@/lib/queries";
import { Shell } from "@/components/Shell";
import { Badge, EmptyState } from "@skilldrunk/sd-ui";

export const dynamic = "force-dynamic";

const TONE: Record<string, "success" | "danger" | "warn" | "info"> = {
  success: "success",
  failure: "danger",
  timeout: "warn",
  running: "info",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TasksPage() {
  await requireAdmin("/tasks");
  const runs = await getRecentRuns(80);

  // Group by task_id, keep last 5 runs per task
  const grouped = new Map<string, typeof runs>();
  for (const r of runs) {
    const arr = grouped.get(r.task_id) ?? [];
    if (arr.length < 5) arr.push(r);
    grouped.set(r.task_id, arr);
  }
  const taskList = [...grouped.entries()].map(([id, list]) => ({
    id,
    last: list[0],
    runs: list,
    successRate:
      Math.round(
        (list.filter((r) => r.status === "success").length / list.length) * 100,
      ) || 0,
  }));

  return (
    <Shell currentPath="/tasks">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h1 className="sd-h1">Cowork Tasks</h1>
        <span
          className="sd-mono"
          style={{ fontSize: 12, color: "var(--sd-text-3)" }}
        >
          {runs.length} run · {grouped.size} task
        </span>
      </div>

      {runs.length === 0 ? (
        <EmptyState
          title="Henüz run verisi yok"
          text="tasks-dashboard-cowork-sync (saatlik) çalışınca dolacak. İlk run en geç 1 saat içinde."
        />
      ) : (
        <div className="sd-card" style={{ overflow: "hidden" }}>
          <table className="sd-table sd-table-compact">
            <thead>
              <tr>
                <th>Task</th>
                <th style={{ width: 110 }}>Last</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 80 }}>Süre</th>
                <th style={{ width: 70, textAlign: "right" }}>Başarı</th>
                <th style={{ width: 130 }}>Son 5 run</th>
              </tr>
            </thead>
            <tbody>
              {taskList.map((t) => (
                <tr key={t.id}>
                  <td className="sd-mono" style={{ fontSize: 12 }}>
                    {t.last.task_name}
                  </td>
                  <td
                    className="sd-mono"
                    style={{ fontSize: 11, color: "var(--sd-text-3)" }}
                  >
                    {fmtTime(t.last.started_at)}
                  </td>
                  <td>
                    <Badge tone={TONE[t.last.status] ?? "info"}>
                      {t.last.status}
                    </Badge>
                  </td>
                  <td
                    className="sd-mono"
                    style={{ fontSize: 12, color: "var(--sd-text-2)" }}
                  >
                    {t.last.duration_ms ? `${t.last.duration_ms}ms` : "—"}
                  </td>
                  <td
                    className="sd-mono"
                    style={{
                      fontSize: 12,
                      textAlign: "right",
                      color:
                        t.successRate >= 90
                          ? "var(--sd-success)"
                          : t.successRate >= 70
                            ? "var(--sd-warn)"
                            : "var(--sd-danger)",
                    }}
                  >
                    {t.successRate}%
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 2 }}>
                      {t.runs.map((r) => (
                        <span
                          key={r.id}
                          title={`${r.status} · ${fmtTime(r.started_at)}`}
                          style={{
                            display: "inline-block",
                            width: 16,
                            height: 16,
                            borderRadius: 2,
                            background:
                              r.status === "success"
                                ? "var(--sd-success-bg)"
                                : r.status === "failure"
                                  ? "var(--sd-danger-bg)"
                                  : r.status === "timeout"
                                    ? "var(--sd-warn-bg)"
                                    : "var(--sd-info-bg)",
                            border: `1px solid ${
                              r.status === "success"
                                ? "var(--sd-success)"
                                : r.status === "failure"
                                  ? "var(--sd-danger)"
                                  : r.status === "timeout"
                                    ? "var(--sd-warn)"
                                    : "var(--sd-info)"
                            }`,
                          }}
                        />
                      ))}
                    </div>
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
