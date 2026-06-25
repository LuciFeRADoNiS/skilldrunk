import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/library/decisions",
    label: "Decisions",
    desc: "Vault'taki 99-decisions-log dosyaları (Dual-Brain-Web vs.).",
  },
  {
    href: "/library/briefings",
    label: "Briefings",
    desc: "brief.skilldrunk.com günlük ve haftalık brief'ler.",
  },
  {
    href: "/library/reviews",
    label: "Reviews",
    desc: "Z Raporları ve weekly review'lar.",
  },
];

export default async function LibraryPage() {
  await requireOwner();
  return (
    <PageShell
      eyebrow="library"
      title="Library"
      description="Kararlar, brief'ler, review'lar."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bd-surface"
            style={{
              padding: "16px 18px",
              textDecoration: "none",
              color: "var(--bd-text)",
              display: "block",
            }}
          >
            <strong style={{ fontSize: 14 }}>{s.label}</strong>
            <p style={{ fontSize: 12, color: "var(--bd-text-3)", margin: "6px 0 0 0" }}>
              {s.desc}
            </p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
