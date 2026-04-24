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

export default async function AdminDashboard() {
  const { supabase, user, profile } = await requireAdmin("/");

  const { data } = await supabase.rpc("sd_admin_stats");
  const stats = (data as EcosystemStats) ?? ({} as EcosystemStats);

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
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            Çıkış Yap
          </button>
        </form>
      </div>

      {/* Ecosystem stats */}
      <section className="mb-10">
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

      {/* Apps */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Apps
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {APPS.map((app) => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noreferrer"
              className={`group flex items-center justify-between rounded-lg border px-4 py-3 transition ${
                app.status === "live"
                  ? "border-neutral-800 bg-neutral-950 hover:border-orange-900 hover:bg-neutral-900"
                  : "border-dashed border-neutral-900 bg-transparent opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{app.name}</span>
                  {app.status === "live" ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                      LIVE
                    </span>
                  ) : (
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-mono text-neutral-500">
                      PLANNED
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {app.description}
                </p>
                <p className="mt-1 font-mono text-[10px] text-neutral-600">
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

      {/* Marketplace management */}
      <section className="mb-10">
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

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Kendi Hesabım
        </h2>
        <div className="flex gap-3">
          <Link
            href="/reset-password"
            className="rounded-md border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900"
          >
            Şifremi değiştir
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
