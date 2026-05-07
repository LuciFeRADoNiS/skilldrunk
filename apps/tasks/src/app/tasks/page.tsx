import { requireAdmin } from "@/lib/auth";
import { getRecentRuns } from "@/lib/queries";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  success: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  failure: "bg-rose-900/40 text-rose-300 border-rose-700/50",
  timeout: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  running: "bg-blue-900/40 text-blue-300 border-blue-700/50",
};

export default async function TasksPage() {
  await requireAdmin("/tasks");
  const runs = await getRecentRuns(50);

  // Group by task_id to show last run per task
  const byTask = new Map<string, typeof runs>();
  for (const r of runs) {
    if (!byTask.has(r.task_id)) byTask.set(r.task_id, []);
    byTask.get(r.task_id)!.push(r);
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Cowork Tasks</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Son 50 task çalıştırması · {byTask.size} farklı task
      </p>

      {runs.length === 0 ? (
        <div className="border border-neutral-800 rounded-lg p-8 text-center text-neutral-500">
          Henüz veri yok. <code>tasks-dashboard-cowork-sync</code> Cowork
          task&apos;ı çalışınca dolacak.
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">Task</th>
                <th className="px-4 py-2 text-left">Last Run</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {[...byTask.entries()].map(([taskId, list]) => {
                const last = list[0];
                return (
                  <tr
                    key={taskId}
                    className="border-t border-neutral-800 hover:bg-neutral-900/30"
                  >
                    <td className="px-4 py-2 font-mono text-xs">
                      {last.task_name}
                    </td>
                    <td className="px-4 py-2 text-neutral-400">
                      {new Date(last.started_at).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block border rounded px-2 py-0.5 text-xs ${
                          STATUS_BADGE[last.status] ?? "border-neutral-700"
                        }`}
                      >
                        {last.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-neutral-400">
                      {last.duration_ms ? `${last.duration_ms}ms` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
