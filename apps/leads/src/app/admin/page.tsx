import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();

  const [
    { count: prospectCount },
    { count: staffCount },
    { count: taskCount },
    { count: pendingApprovals },
  ] = await Promise.all([
    supabase.from("sd_lead_prospects").select("*", { count: "exact", head: true }),
    supabase.from("sd_lead_staff").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("sd_lead_tasks").select("*", { count: "exact", head: true }),
    supabase
      .from("sd_lead_tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["email_sent", "submitted"]),
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

      <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-6 text-sm text-neutral-400">
        <p className="font-medium text-neutral-200">M2 scaffold — hazır.</p>
        <p className="mt-2">
          Bir sonraki adım (M3): /admin/new ile görev oluştur, /admin/templates ile Day 0/3/7
          şablonlarını yönet, /api/leads/import-apollo ile Cowork prospect besler.
        </p>
      </div>
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
