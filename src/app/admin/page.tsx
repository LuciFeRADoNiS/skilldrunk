import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Flag,
  MessageSquare,
  Search,
  Swords,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminStats } from "@/app/actions/admin";
import { SKILL_TYPE_LABELS, type SkillType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — skilldrunk" };

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const cards = [
    {
      label: "Published Skills",
      value: stats.total_skills,
      icon: FileText,
      href: "/admin/skills",
    },
    {
      label: "Users",
      value: stats.total_users,
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "Votes",
      value: stats.total_votes,
      icon: TrendingUp,
    },
    {
      label: "Comments",
      value: stats.total_comments,
      icon: MessageSquare,
    },
    {
      label: "Arena Matches",
      value: stats.total_arena_matches,
      icon: Swords,
    },
    {
      label: "Open Reports",
      value: stats.open_reports,
      icon: Flag,
      href: "/admin/reports",
      alert: stats.open_reports > 0,
    },
    {
      label: "Pageviews (today)",
      value: stats.pageviews_today,
      icon: TrendingUp,
    },
    {
      label: "Pageviews (7d)",
      value: stats.pageviews_7d,
      icon: TrendingUp,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Stat cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const inner = (
            <Card
              className={`transition hover:shadow-sm ${
                c.alert ? "border-red-300 dark:border-red-800" : ""
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {c.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          );
          return c.href ? (
            <Link key={c.label} href={c.href}>
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Skills by type */}
        <div>
          <h2 className="mb-3 font-semibold">Skills by Type</h2>
          {stats.skills_by_type ? (
            <div className="space-y-2">
              {Object.entries(stats.skills_by_type)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between rounded-lg border px-4 py-2"
                  >
                    <span className="text-sm">
                      {SKILL_TYPE_LABELS[type as SkillType] ?? type}
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {(count as number).toLocaleString()}
                    </Badge>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </div>

        {/* Signups 7d */}
        <div>
          <h2 className="mb-3 font-semibold">Signups (last 7 days)</h2>
          {stats.signups_7d ? (
            <div className="space-y-1">
              {stats.signups_7d.map((d) => (
                <div
                  key={d.date}
                  className="flex items-center justify-between rounded-lg border px-4 py-2"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {d.date}
                  </span>
                  <span className="font-mono text-sm font-semibold">
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </div>

        {/* Top searches */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Search className="h-4 w-4" />
            Top Searches (7d)
          </h2>
          {stats.top_searches && stats.top_searches.length > 0 ? (
            <div className="space-y-1">
              {stats.top_searches.map((s, i) => (
                <div
                  key={s.query}
                  className="flex items-center justify-between rounded-lg border px-4 py-2"
                >
                  <span className="text-sm">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {i + 1}.
                    </span>
                    {s.query}
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {s.count}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No searches yet — data will appear after search logging is active.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
