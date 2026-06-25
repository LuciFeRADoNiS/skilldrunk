import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireOwner();
  return (
    <PageShell
      eyebrow="analytics"
      title="Analytics"
      description="GA4 — Skilldrunk · ENCO · MoveTech · ENCOLAY."
      coach={{
        message:
          "GA4 entegrasyonu Faz 2.5'te. KPI snapshot tablosu (brain_kpi_snapshot) hazır, doldurulmayı bekliyor.",
        actions: [{ label: "Ayarlar", href: "/settings" }],
      }}
    />
  );
}
