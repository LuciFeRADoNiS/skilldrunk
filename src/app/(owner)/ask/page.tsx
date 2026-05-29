import { AskPanel } from "@skilldrunk/brain-ui";
import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  await requireOwner();
  return (
    <PageShell
      eyebrow="ask brain"
      title="Soru sor"
      description="Geçmiş projeler, kararlar, aktivite üzerinden cevap (vector + Claude Haiku). Streaming SSE."
    >
      <AskPanel
        endpoint="/api/brain/ask"
        defaultRealm="work"
        realms={["work", "personal", "shared"]}
        placeholder="Örn. Daimler RFI durumu ne? Bu hafta hangi prototipi yapmıştım?"
      />
    </PageShell>
  );
}
