import { requireAdmin } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";

export const dynamic = "force-dynamic";

export default async function SkillEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireAdmin();
  return (
    <PageShell
      eyebrow="library · düzenle"
      title="Skill alanlarını düzenle"
      description={slug}
      coach={{
        message:
          "Skill alan düzenleme formu yakında (P6b). Küratör katmanını (not / öncelik / favori) şimdilik detay sayfasından düzenleyebilirsin.",
        actions: [{ label: "← Detaya dön", href: `/skills/${slug}` }],
      }}
    />
  );
}
