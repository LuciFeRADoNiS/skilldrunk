import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { ReportActions } from "./report-actions";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-500/10 text-red-400 border-red-900",
  reviewed: "bg-blue-500/10 text-blue-400 border-blue-900",
  actioned: "bg-emerald-500/10 text-emerald-400 border-emerald-900",
  dismissed: "bg-neutral-500/10 text-neutral-500 border-neutral-800",
};

type Row = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  sd_profiles: { username: string } | null;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { supabase, profile } = await requireAdmin("/reports");

  let query = supabase
    .from("sd_reports")
    .select(
      "id, target_type, target_id, reason, details, status, created_at, sd_profiles!sd_reports_reporter_id_fkey(username)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data } = await query.returns<Row[]>();
  const reports = data ?? [];

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Reports</h1>

        <div className="mb-6 flex gap-2">
          {["all", "open", "reviewed", "actioned", "dismissed"].map((s) => (
            <a
              key={s}
              href={s === "all" ? "/reports" : `/reports?status=${s}`}
              className={`rounded-md border px-3 py-1.5 text-xs capitalize ${
                (s === "all" && !status) || s === status
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              {s}
            </a>
          ))}
        </div>

        {reports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-900 p-12 text-center text-sm text-neutral-500">
            Bu filtrede report yok.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-900">
            <table className="w-full text-sm">
              <thead className="bg-neutral-950 text-left text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Target</th>
                  <th className="px-4 py-2.5 font-medium">Reason</th>
                  <th className="px-4 py-2.5 font-medium">Reporter</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      <div>{r.target_type}</div>
                      <div className="text-[10px] text-neutral-500">
                        {r.target_id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-2.5">
                      <div className="truncate">{r.reason}</div>
                      {r.details && (
                        <div className="truncate text-xs text-neutral-500">
                          {r.details}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-400">
                      {r.sd_profiles?.username ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${STATUS_COLORS[r.status] ?? ""}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-neutral-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ReportActions
                        reportId={r.id}
                        currentStatus={r.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
