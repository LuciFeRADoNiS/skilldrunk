import { requireAdmin } from "@/lib/auth";
import { getCostThisWeek } from "@/lib/queries";
import { Shell } from "@/components/Shell";
import { Stat, StatGrid, EmptyState } from "@skilldrunk/sd-ui";

export const dynamic = "force-dynamic";

export default async function CostPage() {
  await requireAdmin("/cost");
  const days = await getCostThisWeek();

  const byProvider = new Map<string, number>();
  const byBot = new Map<string, number>();
  let total = 0;
  for (const d of days) {
    byProvider.set(d.provider, (byProvider.get(d.provider) ?? 0) + d.cost_usd);
    byBot.set(d.bot, (byBot.get(d.bot) ?? 0) + d.cost_usd);
    total += d.cost_usd;
  }
  const topProvider = [...byProvider.entries()].sort((a, b) => b[1] - a[1])[0];
  const topBot = [...byBot.entries()].sort((a, b) => b[1] - a[1])[0];
  const projected = total > 0 && days.length > 0 ? (total / days.length) * 30 : null;

  return (
    <Shell currentPath="/cost">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h1 className="sd-h1">Cost</h1>
        <span
          className="sd-mono"
          style={{ fontSize: 12, color: "var(--sd-text-3)" }}
        >
          son 7 gün · Anthropic + OpenAI + Gemini
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <StatGrid cols={4}>
          <Stat
            label="Hafta toplam"
            value={`$${total.toFixed(2)}`}
            delta={
              projected != null ? `aylık ~$${projected.toFixed(0)}` : "—"
            }
          />
          <Stat
            label="Top provider"
            value={topProvider ? topProvider[0] : "—"}
            delta={topProvider ? `$${topProvider[1].toFixed(2)}` : "—"}
          />
          <Stat
            label="Top bot"
            value={topBot ? topBot[0] : "—"}
            delta={topBot ? `$${topBot[1].toFixed(2)}` : "—"}
          />
          <Stat
            label="Veri günü"
            value={`${days.length}/7`}
            tone={days.length === 7 ? "up" : "warn"}
          />
        </StatGrid>
      </div>

      {days.length === 0 ? (
        <EmptyState
          title="Henüz cost verisi yok"
          text="tasks-dashboard-cost-sync günlük 03:30'da çalışacak (Anthropic + OpenAI usage endpoint)."
        />
      ) : (
        <div className="sd-card" style={{ overflow: "hidden" }}>
          <table className="sd-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Tarih</th>
                <th>Provider</th>
                <th>Bot</th>
                <th style={{ textAlign: "right", width: 110 }}>Input</th>
                <th style={{ textAlign: "right", width: 110 }}>Output</th>
                <th style={{ textAlign: "right", width: 90 }}>$</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={i}>
                  <td className="sd-mono" style={{ fontSize: 12 }}>
                    {d.date}
                  </td>
                  <td>{d.provider}</td>
                  <td style={{ color: "var(--sd-text-2)" }}>{d.bot}</td>
                  <td
                    className="sd-mono"
                    style={{ fontSize: 12, textAlign: "right" }}
                  >
                    {d.input_tokens.toLocaleString()}
                  </td>
                  <td
                    className="sd-mono"
                    style={{ fontSize: 12, textAlign: "right" }}
                  >
                    {d.output_tokens.toLocaleString()}
                  </td>
                  <td
                    className="sd-mono"
                    style={{ textAlign: "right", fontWeight: 500 }}
                  >
                    ${d.cost_usd.toFixed(2)}
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
