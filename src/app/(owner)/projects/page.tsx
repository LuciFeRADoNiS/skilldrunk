import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";
import { ShuffleGrid } from "@skilldrunk/brain-ui";
import type { BrainItem } from "@skilldrunk/brain-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { supabase } = await requireOwner();
  // brain_items realm=work + source=obsidian = Projects/ klasör export'u
  const { data } = await supabase
    .from("brain_items")
    .select("*")
    .eq("realm", "work")
    .in("source", ["obsidian", "github"])
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(60);

  return (
    <PageShell
      eyebrow="projects"
      title="Aktif projeler"
      description="Obsidian Projects/ + GitHub repos (work realm)."
    >
      <ShuffleGrid
        items={(data ?? []) as BrainItem[]}
        detailHrefPrefix="/catalog"
        emptyCoach={{
          message:
            "Henüz proje yok. Obsidian Projects/ klasörüne README.md ekle, ingest çalıştır.",
          actions: [{ label: "Manuel ekle", href: "/catalog/add" }],
        }}
      />
    </PageShell>
  );
}
