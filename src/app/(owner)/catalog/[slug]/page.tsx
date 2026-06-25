import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/owner/auth";
import type { BrainItem } from "@skilldrunk/brain-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CatalogDetailPage({ params }: Props) {
  const { supabase } = await requireOwner();
  const { slug } = await params;
  const { data, error } = await supabase
    .from("brain_items")
    .select(
      "id, slug, title, subtitle, description, category, source, kind, realm, status, url, cover_url, metadata, ingested_at, last_synced_at, updated_at, visible_skilldrunk, visible_skimsoulfat",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) notFound();
  const item = data as Partial<BrainItem> & { id: string; title: string };

  return (
    <article style={{ maxWidth: 760 }}>
      <p
        style={{
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--bd-text-3)",
          margin: 0,
          marginBottom: 4,
        }}
      >
        catalog · {item.source} · {item.kind}
      </p>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          margin: "0 0 6px 0",
        }}
      >
        {item.title}
      </h1>
      {item.subtitle && (
        <p style={{ fontSize: 15, color: "var(--bd-text-2)", margin: 0 }}>
          {item.subtitle}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {item.category && <span className="bd-chip">{item.category}</span>}
        <span className="bd-chip" style={{ background: "transparent", border: "1px solid var(--bd-border)", color: "var(--bd-text-2)" }}>
          realm: {item.realm}
        </span>
        <span className="bd-chip" style={{ background: "transparent", border: "1px solid var(--bd-border)", color: "var(--bd-text-2)" }}>
          status: {item.status}
        </span>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="bd-chip"
            style={{ textDecoration: "none" }}
          >
            Aç ↗
          </a>
        )}
      </div>

      {item.description && (
        <section className="bd-surface" style={{ padding: "16px 18px", marginTop: 22 }}>
          <p style={{ margin: 0, lineHeight: 1.6, color: "var(--bd-text)" }}>
            {item.description}
          </p>
        </section>
      )}

      <section style={{ marginTop: 22 }}>
        <h2
          style={{
            fontSize: 12,
            color: "var(--bd-text-3)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: "0 0 10px 0",
          }}
        >
          metadata
        </h2>
        <pre
          className="bd-surface"
          style={{
            padding: 14,
            fontSize: 12,
            fontFamily: "var(--bd-font-mono)",
            color: "var(--bd-text-2)",
            overflow: "auto",
            margin: 0,
          }}
        >
{JSON.stringify(item.metadata ?? {}, null, 2)}
        </pre>
      </section>

      <footer
        style={{
          marginTop: 20,
          fontSize: 11,
          color: "var(--bd-text-3)",
          fontFamily: "var(--bd-font-mono)",
        }}
      >
        last_synced: {item.last_synced_at ?? "—"} · updated: {item.updated_at}
      </footer>
    </article>
  );
}
