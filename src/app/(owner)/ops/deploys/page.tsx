import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";

export const dynamic = "force-dynamic";

interface BrainItemRow {
  title: string;
  url: string | null;
  last_synced_at: string | null;
  metadata: Record<string, unknown>;
}

export default async function OpsDeploysPage() {
  const { supabase } = await requireOwner();
  const { data } = await supabase
    .from("brain_items")
    .select("title, url, last_synced_at, metadata")
    .eq("source", "vercel")
    .order("last_synced_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as BrainItemRow[];

  if (rows.length === 0) {
    return (
      <PageShell
        eyebrow="ops · deploys"
        title="Deploys"
        description="brain_items.source = vercel."
        coach={{
          message:
            "Vercel ingest henüz çalışmadı veya VERCEL_TOKEN eksik. Faz 1 follow-up.",
          actions: [{ label: "scripts/ingest/vercel.ts", href: "/ops/scheduled" }],
        }}
      />
    );
  }

  return (
    <PageShell
      eyebrow="ops · deploys"
      title="Deploys"
      description={`Vercel projects: ${rows.length}. Cron: brain-ingest-vercel /4h.`}
    >
      <ul className="bd-surface" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {rows.map((r) => {
          const lastDeploy =
            (r.metadata?.last_deploy as { state?: string; created_at?: string } | undefined);
          const state = lastDeploy?.state ?? "—";
          const stateColor =
            state === "READY"
              ? "var(--bd-success)"
              : state === "ERROR"
                ? "var(--bd-danger)"
                : "var(--bd-text-3)";
          return (
            <li
              key={r.title}
              style={{
                display: "flex",
                gap: 10,
                padding: "10px 16px",
                borderBottom: "1px solid var(--bd-border)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: stateColor,
                }}
              />
              <span style={{ flex: 1, fontSize: 13 }}>
                {r.url ? (
                  <a className="bd-link" href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                ) : (
                  r.title
                )}
              </span>
              <span style={{ fontSize: 10, fontFamily: "var(--bd-font-mono)", color: "var(--bd-text-3)" }}>
                {state} · {r.last_synced_at?.slice(0, 16) ?? "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
