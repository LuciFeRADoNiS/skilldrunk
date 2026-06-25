import { requireAdmin } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";

export const dynamic = "force-dynamic";

export default async function SkillAskPage() {
  await requireAdmin();
  return (
    <PageShell
      eyebrow="library · ask"
      title="Skill'lere sor"
      description="Kütüphanende AI ile semantik arama."
      coach={{
        message:
          "Yakında: /api/ai/find + sd_skill_search_vector üzerinden semantik skill araması. Şimdilik genel beyin için Ask Brain.",
        actions: [{ label: "Ask Brain", href: "/ask" }],
      }}
    />
  );
}
