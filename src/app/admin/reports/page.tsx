import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { getAdminReports } from "@/app/actions/admin";
import { ReportActions } from "./report-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reports — Admin" };

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-500/10 text-red-600 border-red-200",
  reviewed: "bg-blue-500/10 text-blue-600 border-blue-200",
  actioned: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  dismissed: "bg-muted text-muted-foreground",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const reports = await getAdminReports(status);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Reports</h1>

      {/* Status filter */}
      <div className="mb-6 flex gap-2">
        {["all", "open", "reviewed", "actioned", "dismissed"].map((s) => (
          <a
            key={s}
            href={s === "all" ? "/admin/reports" : `/admin/reports?status=${s}`}
            className={`rounded-md border px-3 py-1.5 text-xs capitalize transition hover:bg-muted ${
              (s === "all" && !status) || s === status
                ? "border-foreground/30 bg-muted font-semibold"
                : ""
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Reporter</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.target_type}
                    </span>
                    <br />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {r.target_id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="max-w-[200px] px-4 py-3">
                    <p className="truncate text-sm">{r.reason}</p>
                    {r.details && (
                      <p className="truncate text-xs text-muted-foreground">
                        {r.details}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.reporter?.username ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${STATUS_COLORS[r.status] ?? ""}`}
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReportActions
                      reportId={r.id}
                      currentStatus={r.status}
                    />
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
