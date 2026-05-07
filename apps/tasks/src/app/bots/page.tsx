import { requireAdmin } from "@/lib/auth";
import { getBotHealth } from "@/lib/queries";
import { Shell } from "@/components/Shell";
import { Stat, StatGrid, Dot, Badge } from "@skilldrunk/sd-ui";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, "green" | "yellow" | "red" | "gray"> = {
  green: "green",
  yellow: "yellow",
  red: "red",
  unknown: "gray",
};
const STATUS_LABEL: Record<string, string> = {
  green: "Sağlıklı",
  yellow: "Uyarı",
  red: "Kritik",
  unknown: "Bilinmiyor",
};

function fmtUptime(s: number | null) {
  if (!s) return "—";
  if (s < 3600) return `${Math.floor(s / 60)}dk`;
  if (s < 86400)
    return `${Math.floor(s / 3600)}sa ${Math.floor((s % 3600) / 60)}dk`;
  return `${Math.floor(s / 86400)}g ${Math.floor((s % 86400) / 3600)}sa`;
}

function fmtRel(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}sn önce`;
  if (s < 3600) return `${Math.floor(s / 60)}dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa önce`;
  return `${Math.floor(s / 86400)}g önce`;
}

export default async function BotsPage() {
  await requireAdmin("/bots");
  const bots = await getBotHealth();

  const counts = {
    green: bots.filter((b) => b.status === "green").length,
    yellow: bots.filter((b) => b.status === "yellow").length,
    red: bots.filter((b) => b.status === "red").length,
    unknown: bots.filter((b) => b.status === "unknown").length,
  };
  const totalRam = bots.reduce((sum, b) => sum + (b.ram_mb ?? 0), 0);

  return (
    <Shell currentPath="/bots">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h1 className="sd-h1">Bot Health</h1>
        <span
          className="sd-mono"
          style={{ fontSize: 12, color: "var(--sd-text-3)" }}
        >
          {bots.length} bot · jax-health-collect 5dk timer
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <StatGrid cols={4}>
          <Stat label="Sağlıklı" value={counts.green} tone="up" />
          <Stat label="Uyarı / Kritik" value={counts.yellow + counts.red} />
          <Stat label="Bilinmiyor" value={counts.unknown} />
          <Stat label="Toplam RAM" value={`${totalRam} MB`} />
        </StatGrid>
      </div>

      <div className="sd-card" style={{ overflow: "hidden" }}>
        <table className="sd-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Bot</th>
              <th>Durum</th>
              <th style={{ width: 100, textAlign: "right" }}>RAM</th>
              <th style={{ width: 130, textAlign: "right" }}>Uptime</th>
              <th style={{ width: 100, textAlign: "right" }}>Restart</th>
              <th style={{ width: 130 }}>Son görüldü</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((b) => (
              <tr key={b.bot_name} id={b.bot_name}>
                <td>
                  <Dot
                    color={STATUS_DOT[b.status] ?? "gray"}
                    pulse={b.status === "green"}
                  />
                </td>
                <td
                  style={{
                    fontWeight: 500,
                    textTransform: "capitalize",
                  }}
                >
                  {b.bot_name}
                </td>
                <td>
                  <Badge
                    tone={
                      b.status === "green"
                        ? "success"
                        : b.status === "yellow"
                          ? "warn"
                          : b.status === "red"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {STATUS_LABEL[b.status] ?? "—"}
                  </Badge>
                  {b.last_error && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--sd-danger)",
                        marginTop: 2,
                      }}
                    >
                      {b.last_error.slice(0, 60)}
                    </div>
                  )}
                </td>
                <td
                  className="sd-mono"
                  style={{
                    fontSize: 12,
                    textAlign: "right",
                    color: "var(--sd-text-2)",
                  }}
                >
                  {b.ram_mb != null ? `${b.ram_mb} MB` : "—"}
                </td>
                <td
                  className="sd-mono"
                  style={{
                    fontSize: 12,
                    textAlign: "right",
                    color: "var(--sd-text-2)",
                  }}
                >
                  {fmtUptime(b.uptime_s)}
                </td>
                <td
                  className="sd-mono"
                  style={{
                    fontSize: 12,
                    textAlign: "right",
                    color: "var(--sd-text-2)",
                  }}
                >
                  {b.restart_count != null ? b.restart_count : "—"}
                </td>
                <td
                  className="sd-mono"
                  style={{ fontSize: 11, color: "var(--sd-text-3)" }}
                >
                  {fmtRel(b.last_seen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
