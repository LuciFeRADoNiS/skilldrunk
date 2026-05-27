import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";

export const dynamic = "force-dynamic";

export default async function OpsScheduledPage() {
  await requireOwner();
  return (
    <PageShell
      eyebrow="ops · scheduled"
      title="Scheduled Tasks"
      description="Cowork scheduled task'larının read-only mirror'ı (Faz 2.5)."
      coach={{
        message:
          "Cowork tasks API endpoint'i hazır değil. Brain ingestion task'ları çalışıyor: brain-ingest-{vercel,github,obsidian,admin-apps}, brain-digest-generate.",
      }}
    />
  );
}
