import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";

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

type AppRow = {
  slug: string;
  title: string;
  tagline: string | null;
  url: string;
  status: string;
  tags: string[] | null;
};

const KIND_ICONS: Record<string, string> = {
  new_user: "👤",
  new_skill: "✨",
  new_report: "🚩",
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return iso.split("T")[0];
}

export default async function AdminDashboard() {
  const { supabase, user, profile } = await requireAdmin("/");

  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [statsRes, notifRes, pvRes, unreadRes, appsRes] = await Promise.all([
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
    supabase
      .from("pt_apps")
      .select("slug, title, tagline, url, status, tags")
      .neq("status", "archived")
      .or("subdomain.not.is.null,slug.eq.marketplace")
      .order("title", { ascending: true })
      .returns<AppRow[]>(),
  ]);

  const stats = (statsRes.data as EcosystemStats) ?? ({} as EcosystemStats);
  const notifications = notifRes.data ?? [];
  const unreadCount = unreadRes.count ?? 0;
  const apps = appsRes.data ?? [];

  // 7-day pageview breakdown
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

  const liveApps = apps.filter((a) => a.status === "live").length;

  // Hero stats prioritized for mobile glance-ability
  const heroStats: { label: string; value: number; alert?: boolean }[] = [
    { label: "Pageview bugün", value: stats.pageviews_today ?? 0 },
    { label: "Pageview 7g", value: stats.pageviews_7d ?? 0 },
    { label: "Skills", value: stats.total_skills ?? 0 },
    { label: "Kullanıcılar", value: stats.total_users ?? 0 },
    {
      label: "Açık report",
      value: stats.open_reports ?? 0,
      alert: (stats.open_reports ?? 0) > 0,
    },
    { label: "Live app", value: liveApps },
  ];

  return (
    <>
      <div className="aurora" />
      <AdminNav userLabel={profile?.display_name ?? undefined} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 sm:pt-6 pb-10">
        {/* === Hero === */}
        <section className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">
            skilldrunk ecosystem
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Hoş geldin, {profile?.display_name ?? user.email?.split("@")[0]}
            </h1>
            <Link
              href="/notifications"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono transition ${
                unreadCount > 0
                  ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/30"
                  : "glass text-neutral-400"
              }`}
              title={`${unreadCount} okunmamış`}
            >
              <span aria-hidden>🔔</span>
              {unreadCount > 0 ? unreadCount : ""}
            </Link>
          </div>
        </section>

        {/* === Hero stat carousel (horizontal scroll on mobile, grid on desktop) === */}
        <section className="mb-6 -mx-4 sm:mx-0">
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6">
            {heroStats.map((s) => (
              <div
                key={s.label}
                className={`glass min-w-[140px] sm:min-w-0 rounded-2xl p-4 ${
                  s.alert ? "ring-1 ring-red-500/40" : ""
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  {s.label}
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold ${
                    s.alert ? "text-red-400" : "stat-num"
                  }`}
                >
                  {s.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* === Quick actions === */}
        <section className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <QuickAction href="/ai" icon="✦" label="AI Asistan" />
            <QuickAction href="/map" icon="◈" label="Ekosistem Map" />
            <QuickAction href="/usage" icon="$" label="AI Maliyet" />
            <QuickAction href="/apps" icon="▦" label="Tüm Apps" />
          </div>
        </section>

        {/* === Traffic chart === */}
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Trafik · son 7g
            </h2>
            <span className="text-[11px] font-mono text-neutral-500">
              tepe {pvMax}
            </span>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-end gap-1.5">
              {pageviews.map((d) => {
                const h = Math.round((d.count / pvMax) * 100);
                return (
                  <div
                    key={d.day}
                    className="flex flex-1 flex-col items-center gap-1.5 min-w-0"
                  >
                    <div className="flex h-20 sm:h-24 w-full items-end">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-orange-600/60 to-orange-400/80"
                        style={{ height: `${h}%`, minHeight: "3px" }}
                        title={`${d.day}: ${d.count}`}
                      />
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-neutral-400">
                      {d.count}
                    </span>
                    <span className="font-mono text-[9px] text-neutral-600">
                      {d.day.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* === Activity feed === */}
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Son Aktivite
          </h2>
          {notifications.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-sm text-neutral-500">
              Henüz bildirim yok.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`glass flex gap-3 rounded-2xl px-4 py-3 ${
                    !n.read ? "ring-1 ring-orange-500/20" : ""
                  }`}
                >
                  <span className="text-lg">{KIND_ICONS[n.kind] ?? "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${!n.read ? "font-medium" : "text-neutral-300"}`}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="truncate text-xs text-neutral-500">
                        {n.body}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 self-start font-mono text-[10px] text-neutral-600">
                    {relTime(n.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* === Apps grid === */}
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Apps
            </h2>
            <Link
              href="/apps"
              className="text-[11px] font-mono text-neutral-500 hover:text-neutral-300"
            >
              tümü →
            </Link>
          </div>
          {apps.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-sm text-neutral-500">
              pt_apps tablosu boş.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {apps.map((app) => {
                const isLive = app.status === "live";
                const isCowork = (app.tags ?? []).includes("cowork-managed");
                return (
                  <a
                    key={app.slug}
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`glass relative rounded-2xl p-3 active:scale-[0.98] transition ${
                      isLive ? "" : "opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          isLive ? "bg-emerald-400" : "bg-neutral-600"
                        }`}
                      />
                      <span className="font-semibold text-sm truncate flex-1">
                        {app.title}
                      </span>
                      {isCowork && (
                        <span
                          title="Cowork-managed"
                          className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/80"
                        />
                      )}
                    </div>
                    {app.tagline && (
                      <p className="text-[11px] text-neutral-500 line-clamp-2 mb-1">
                        {app.tagline}
                      </p>
                    )}
                    <p className="font-mono text-[10px] text-neutral-600 truncate">
                      {app.url.replace("https://", "")}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* === Yönetim === */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Yönetim
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/skills"
              className="glass rounded-2xl p-4 active:scale-[0.98] transition"
            >
              <p className="font-medium text-sm">Skills</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                publish / draft
              </p>
            </Link>
            <Link
              href="/users"
              className="glass rounded-2xl p-4 active:scale-[0.98] transition"
            >
              <p className="font-medium text-sm">Users</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">roles</p>
            </Link>
            <Link
              href="/reports"
              className="glass rounded-2xl p-4 active:scale-[0.98] transition"
            >
              <p className="font-medium text-sm">
                Reports
                {(stats.open_reports ?? 0) > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] text-red-300">
                    {stats.open_reports}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">flagged</p>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="glass rounded-2xl px-3 py-3.5 flex items-center gap-2.5 active:scale-[0.98] active:ring-accent transition"
    >
      <span
        aria-hidden
        className="grid place-items-center h-9 w-9 rounded-xl bg-orange-500/10 text-orange-400 text-base"
      >
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
