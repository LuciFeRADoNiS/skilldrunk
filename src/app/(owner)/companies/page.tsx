import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";

export const dynamic = "force-dynamic";

const COMPANIES = [
  { slug: "enco", name: "ENCO", desc: "Logistics + nakliye" },
  { slug: "movetech", name: "MoveTech", desc: "ERP + portal" },
  { slug: "encolay", name: "ENCOLAY", desc: "İhracat" },
  { slug: "futurecode", name: "FutureCode", desc: "Software house" },
  { slug: "greenix", name: "Greenix", desc: "Yeni — taslak" },
];

export default async function CompaniesPage() {
  await requireOwner();
  return (
    <PageShell
      eyebrow="companies"
      title="Şirketler"
      description="ENCO, MoveTech, ENCOLAY, FutureCode, Greenix."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {COMPANIES.map((c) => (
          <div key={c.slug} className="bd-surface" style={{ padding: "16px 18px" }}>
            <strong style={{ fontSize: 15 }}>{c.name}</strong>
            <p style={{ fontSize: 12, color: "var(--bd-text-2)", margin: "6px 0 0 0" }}>
              {c.desc}
            </p>
            <p style={{ fontSize: 10, color: "var(--bd-text-3)", margin: "10px 0 0 0", fontFamily: "var(--bd-font-mono)" }}>
              brain_items kategorisi sayfası Faz 2.5
            </p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
