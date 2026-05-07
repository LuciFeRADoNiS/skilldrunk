import { requireAdmin } from "@/lib/auth";
import {
  getBotHealth,
  getRecentFailures,
  getOpenAlerts,
} from "@/lib/queries";
import { Shell } from "@/components/Shell";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
  unknown: "bg-neutral-700",
};

const LEVEL_COLOR: Record<string, string> = {
  P0: "text-rose-400 border-rose-700",
  P1: "text-amber-400 border-amber-700",
  P2: "text-blue-400 border-blue-700",
};

function relTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}sn önce`;
  if (s < 3600) return `${Math.floor(s / 60)}dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa önce`;
  return `${Math.floor(s / 86400)}g önce`;
}

export default async function DashboardPage() {
  await requireAdmin("/");
  const [bots, failures, alerts] = await Promise.all([
    getBotHealth(),
    getRecentFailures(5),
    getOpenAlerts(5),
  ]);

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Bot Health
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {bots.map((b) => (
            <Link
              key={b.bot_name}
              href={`/bots#${b.bot_name}`}
              className="border border-neutral-800 rounded-lg px-3 py-3 hover:border-neutral-600 transition bg-neutral-900/40"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    STATUS_COLOR[b.status] ?? STATUS_COLOR.unknown
                  }`}
                />
                <span className="text-sm font-medium capitalize">
                  {b.bot_name}
                </span>
              </div>
              <div className="text-xs text-neutral-500">
                {b.status === "unknown" ? "henüz veri yok" : relTime(b.last_seen)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
            Son Failed Tasks
          </h2>
          {failures.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Hiç fail eden task yok ✓
            </p>
          ) : (
            <div className="space-y-2">
              {failures.map((f) => (
                <div
                  key={f.id}
                  className="border border-rose-900/50 bg-rose-950/20 rounded-lg px-3 py-2"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{f.task_name}</span>
                    <span className="text-xs text-neutral-500">
                      {relTime(f.started_at)}
                    </span>
                  </div>
                  {f.error && (
                    <div className="text-xs text-rose-400 mt-1 truncate">
                      {f.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
            Açık Alerts
          </h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-neutral-500">Açık alert yok ✓</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`border rounded-lg px-3 py-2 bg-neutral-900/40 ${
                    LEVEL_COLOR[a.level] ?? "border-neutral-800"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono">
                      {a.level} · {a.source}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {relTime(a.ts)}
                    </span>
                  </div>
                  <div className="text-sm mt-1">{a.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
