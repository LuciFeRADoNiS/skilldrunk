import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();

  const [
    { count: prospectCount },
    { count: staffCount },
    { count: taskCount },
    { count: pendingApprovals },
    { data: pendingTasks },
  ] = await Promise.all([
    supabase.from("sd_lead_prospects").select("*", { count: "exact", head: true }),
    supabase.from("sd_lead_staff").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("sd_lead_tasks").select("*", { count: "exact", head: true }),
    supabase
      .from("sd_lead_tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["email_sent", "submitted"]),
    supabase
      .from("sd_lead_tasks")
      .select("id, title, status, submitted_at, updated_at")
      .in("status", ["email_sent", "submitted"])
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-400">
          ENCO satış ekibi outreach pilotu — Lead Portal v1.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Aktif personel" value={staffCount ?? 0} />
        <Stat label="Toplam prospect" value={prospectCount ?? 0} />
        <Stat label="Toplam görev" value={taskCount ?? 0} />
        <Stat label="Onay bekleyen" value={pendingApprovals ?? 0} highlight />
      </div>

      {pendingTasks && pendingTasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Onay bekleyenler
          </h2>
          <ul className="space-y-2">
            {pendingTasks.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/tasks/${t.id}`}
                  className="flex items-center justify-between rounded-lg border border-orange-900/60 bg-orange-950/10 p-3 hover:border-orange-700"
                >
                  <span className="truncate text-sm">{t.title}</span>
                  <span className="shrink-0 text-xs text-orange-300">
                    {t.submitted_at
                      ? new Date(t.submitted_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-orange-900 bg-orange-950/20"
          : "border-neutral-900 bg-neutral-950"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
