import Link from "next/link";
import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/ops/backlog", label: "Backlog", desc: "sd_backlog mirror (admin.skilldrunk.com/backlog)" },
  { href: "/ops/scheduled", label: "Scheduled Tasks", desc: "Cowork task'ları read-only" },
  { href: "/ops/bots", label: "Bot Health", desc: "Atlas, Hermes, Hephaestus, KlauX, Calliope" },
  { href: "/ops/deploys", label: "Deploys", desc: "Vercel son 50 deploy" },
];

export default async function OpsPage() {
  await requireOwner();
  return (
    <PageShell
      eyebrow="operations"
      title="Ops"
      description="Backlog, scheduled tasks, bot health, deploy stream."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="bd-surface"
            style={{
              padding: "16px 18px",
              textDecoration: "none",
              color: "var(--bd-text)",
              display: "block",
            }}
          >
            <strong style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</strong>
            <p style={{ fontSize: 12, color: "var(--bd-text-3)", margin: "6px 0 0 0" }}>
              {t.desc}
            </p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
