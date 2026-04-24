import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

type EcosystemStats = {
  total_skills: number;
  total_users: number;
  total_votes: number;
  total_comments: number;
  total_arena_matches: number;
  open_reports: number;
  pageviews_today: number;
  pageviews_7d: number;
};

type Notification = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

type PageviewDay = { day: string; count: number };

const APPS = [
  {
    name: "Marketplace",
    url: "https://skilldrunk.com",
    description: "Public community — Claude skills, MCP, GPTs",
    status: "live",
  },
  {
    name: "Analiz",
    url: "https://analiz.skilldrunk.com",
    description: "Kişisel event log, dashboard",
    status: "live",
  },
  {
    name: "Admin",
    url: "https://admin.skilldrunk.com",
    description: "Bu panel",
    status: "live",
  },
  {
    name: "Brief",
    url: "https://brief.skilldrunk.com",
    description: "Briefings modülü",
    status: "planned",
  },
  {
    name: "Sub",
    url: "https://sub.skilldrunk.com",
    description: "AI subscription tracker",
    status: "planned",
  },
  {
    name: "Bday",
    url: "https://bday.skilldrunk.com",
    description: "Birthday reminders",
    status: "planned",
  },
];

const KIND_ICONS: Record<string, string> = {
  new_user: "👤",
  new_skill: "✨",
  new_report: "🚩",
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return iso.split("T")[0];
}

export default async function AdminDashboard() {
  const { supabase, user, profile } = await requireAdmin("/");

  // Parallel queries
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [statsRes, notifRes, pvRes, unreadRes] = await Promise.all([
    supabase.rpc("sd_admin_stats"),
    supabase
      .from("sd_notifications")
      .select("id, kind, title, body, read, created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<Notification[]>(),
    supabase
      .from("sd_pageviews")
      .select("created_at")
      .gte("created_at", since7d),
    supabase
      .from("sd_notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false),
  ]);

  const stats = (statsRes.data as EcosystemStats) ?? ({} as EcosystemStats);
  const notifications = notifRes.data ?? [];
  const unreadCount = unreadRes.count ?? 0;

  // Build 7-day pageview breakdown from raw rows
  const pageviews: PageviewDay[] = [];
  const pvMap = new Map<string, number>();
  for (const row of pvRes.data ?? []) {
    const d = new Date(row.created_at as string).toISOString().slice(0, 10);
    pvMap.set(d, (pvMap.get(d) ?? 0) + 1);
  }
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    pageviews.push({ day: d, count: pvMap.get(d) ?? 0 });
  }

  const pvMax = Math.max(1, ...pageviews.map((p) => p.count));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-neutral-500">
            skilldrunk ecosystem
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {profile?.display_name ?? user.email} · {profile?.role}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-mono text-red-400">
              🔔 {unreadCount} okunmamış
            </span>
          )}
          <Link
            href="/reset-password"
            className="rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            Şifre
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              Çıkış
            </button>
          </form>
        </div>
      </div>

      {/* Stat cards */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Marketplace
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Skills" value={stats.total_skills ?? 0} />
          <Stat label="Users" value={stats.total_users ?? 0} />
          <Stat label="Votes" value={stats.total_votes ?? 0} />
          <Stat label="Comments" value={stats.total_comments ?? 0} />
          <Stat label="Arena Matches" value={stats.total_arena_matches ?? 0} />
          <Stat
            label="Open Reports"
            value={stats.open_reports ?? 0}
            alert={(stats.open_reports ?? 0) > 0}
          />
          <Stat label="Pageviews (today)" value={stats.pageviews_today ?? 0} />
          <Stat label="Pageviews (7d)" value={stats.pageviews_7d ?? 0} />
        </div>
      </section>

      {/* Pageviews chart */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Traffic (son 7 gün)
        </h2>
        <div className="flex items-end gap-2 rounded-lg border border-neutral-900 bg-neutral-950 p-4">
          {pageviews.map((d) => {
            const h = Math.round((d.count / pvMax) * 100);
            return (
              <div
                key={d.day}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="flex h-24 w-full items-end">
                  <div
                    className="w-full rounded-t bg-orange-500/70"
                    style={{ height: `${h}%`, minHeight: "2px" }}
                    title={`${d.day}: ${d.count}`}
                  />
                </div>
                <span className="font-mono text-xs tabular-nums text-neutral-400">
                  {d.count}
                </span>
                <span className="font-mono text-[10px] text-neutral-600">
                  {d.day.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-column: activity + apps */}
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr,1fr]">
        {/* Recent activity */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Son Aktivite
          </h2>
          {notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-900 p-8 text-center text-sm text-neutral-500">
              Henüz bildirim yok.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-900 rounded-lg border border-neutral-900 bg-neutral-950">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex gap-3 px-4 py-2.5 ${!n.read ? "bg-orange-500/5" : ""}`}
                >
                  <span className="text-lg">
                    {KIND_ICONS[n.kind] ?? "🔔"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${!n.read ? "font-medium" : ""}`}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="truncate text-xs text-neutral-500">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-0.5 font-mono text-[10px] text-neutral-600">
                      {relTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Apps */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Apps
          </h2>
          <div className="space-y-2">
            {APPS.map((app) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noreferrer"
                className={`group flex items-center justify-between rounded-lg border px-4 py-2.5 transition ${
                  app.status === "live"
                    ? "border-neutral-800 bg-neutral-950 hover:border-orange-900 hover:bg-neutral-900"
                    : "border-dashed border-neutral-900 bg-transparent opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{app.name}</span>
                    {app.status === "live" ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                        LIVE
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-mono text-neutral-500">
                        SOON
                      </span>
                    )}
                  </div>
                  <p className="truncate font-mono text-[10px] text-neutral-600">
                    {app.url.replace("https://", "")}
                  </p>
                </div>
                {app.status === "live" && (
                  <span className="text-neutral-600 transition group-hover:text-orange-400">
                    →
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* Marketplace management */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Yönetim
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/skills"
            className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 hover:border-orange-900"
          >
            <p className="font-medium">Skills</p>
            <p className="mt-1 text-xs text-neutral-500">
              Publish / archive / draft
            </p>
          </Link>
          <Link
            href="/users"
            className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 hover:border-orange-900"
          >
            <p className="font-medium">Users</p>
            <p className="mt-1 text-xs text-neutral-500">Roles, permissions</p>
          </Link>
          <Link
            href="/reports"
            className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 hover:border-orange-900"
          >
            <p className="font-medium">
              Reports
              {(stats.open_reports ?? 0) > 0 && (
                <span className="ml-2 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">
                  {stats.open_reports}
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Flagged content</p>
          </Link>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-neutral-950 p-4 ${
        alert ? "border-red-900" : "border-neutral-800"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          alert ? "text-red-400" : ""
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
