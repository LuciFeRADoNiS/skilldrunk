import { requireAdmin } from "@/lib/auth";
import { getBotHealth } from "@/lib/queries";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

const STATUS_DESC: Record<string, string> = {
  green: "Sağlıklı",
  yellow: "Uyarı",
  red: "Kritik",
  unknown: "Bilinmiyor (henüz veri yok)",
};

const STATUS_COLOR: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
  unknown: "bg-neutral-700",
};

function formatUptime(s: number | null) {
  if (!s) return "—";
  if (s < 3600) return `${Math.floor(s / 60)}dk`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa ${Math.floor((s % 3600) / 60)}dk`;
  return `${Math.floor(s / 86400)}g ${Math.floor((s % 86400) / 3600)}sa`;
}

export default async function BotsPage() {
  await requireAdmin("/bots");
  const bots = await getBotHealth();

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Bot Health</h1>
      <p className="text-sm text-neutral-500 mb-6">
        VPS systemd + RAM + uptime. Veri kaynağı: 5dk cron (henüz canlı değil).
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {bots.map((b) => (
          <div
            key={b.bot_name}
            id={b.bot_name}
            className="border border-neutral-800 rounded-lg p-5 bg-neutral-900/40"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      STATUS_COLOR[b.status] ?? STATUS_COLOR.unknown
                    }`}
                  />
                  <h2 className="text-lg font-semibold capitalize">
                    {b.bot_name}
                  </h2>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {STATUS_DESC[b.status] ?? "—"}
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {b.last_seen
                  ? new Date(b.last_seen).toLocaleString("tr-TR")
                  : "—"}
              </span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <Stat label="RAM" value={b.ram_mb ? `${b.ram_mb} MB` : "—"} />
              <Stat label="Uptime" value={formatUptime(b.uptime_s)} />
              <Stat
                label="Restart"
                value={b.restart_count != null ? String(b.restart_count) : "—"}
              />
            </dl>
            {b.last_error && (
              <div className="mt-3 text-xs text-rose-400 font-mono truncate">
                {b.last_error}
              </div>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-800 rounded p-2">
      <dt className="text-neutral-500 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="font-mono text-neutral-200">{value}</dd>
    </div>
  );
}
