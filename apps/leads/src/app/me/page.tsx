import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const { supabase, staffId } = await requireStaff();

  const { data: tasks } = await supabase
    .from("sd_lead_tasks")
    .select("id, title, type, status, due_at, updated_at")
    .eq("staff_id", staffId)
    .in("status", ["assigned", "in_progress", "rejected"])
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bana atanan görevler</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {tasks?.length ?? 0} aktif görev.
        </p>
      </div>

      {(!tasks || tasks.length === 0) && (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-6 text-center text-sm text-neutral-500">
          Şu an aktif görev yok. Yeni görev geldiğinde burada görünür.
        </div>
      )}

      <ul className="space-y-2">
        {tasks?.map((t) => (
          <li
            key={t.id}
            className="rounded-lg border border-neutral-900 bg-neutral-950 p-4"
          >
            <p className="text-sm font-medium">{t.title}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {t.type} · {t.status}
              {t.due_at && ` · son ${new Date(t.due_at).toLocaleDateString("tr-TR")}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
