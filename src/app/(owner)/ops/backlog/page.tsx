import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";
import { BacklogPanel, type BacklogRow } from "@skilldrunk/brain-ui";

export const dynamic = "force-dynamic";

interface SdBacklogRow {
  id: number;
  title: string;
  priority: number;
  status: string;
  project: string | null;
}

export default async function OpsBacklogPage() {
  const { supabase } = await requireOwner();
  const { data } = await supabase
    .from("sd_backlog")
    .select("id, title, priority, status, project")
    .in("status", ["next", "in_progress", "blocked"])
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(50);

  const rows: BacklogRow[] = (data ?? []).map((r: SdBacklogRow) => ({
    id: r.id,
    title: r.title,
    priority: r.priority,
    status: r.status,
    project: r.project,
  }));

  return (
    <PageShell
      eyebrow="ops · backlog"
      title="Backlog"
      description="sd_backlog (admin.skilldrunk.com/backlog ile aynı kaynak)."
    >
      <BacklogPanel
        rows={rows}
        emptyCoach={{
          message: "Aktif backlog item yok. Yeni hedef ekle veya digest oku.",
          actions: [{ label: "Admin'de aç", href: "https://admin.skilldrunk.com/backlog" }],
        }}
      />
    </PageShell>
  );
}
