import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/owner/auth";
import { SKILL_TYPE_LABELS, type SkillType } from "@/lib/types";
import { CuratorPanel, type CuratorMeta } from "@/components/mine/curator-panel";

export const dynamic = "force-dynamic";

interface VersionRow {
  id: string;
  version: string;
  changelog: string | null;
  created_at: string;
}

export default async function SkillDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requireAdmin();

  const { data: skill } = await supabase
    .from("sd_skills")
    .select(
      "id, slug, title, summary, type, tags, score, status, body_mdx, homepage_url, source_url, install_command, category, license, created_at, updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!skill) notFound();

  const { data: metaRow } = await supabase
    .from("sd_library_meta")
    .select("curation, priority, is_favorite, notes_md, personal_tags, dead_link, last_reviewed_at")
    .eq("skill_id", skill.id)
    .maybeSingle();

  const meta: CuratorMeta = {
    curation: metaRow?.curation ?? "inbox",
    priority: metaRow?.priority ?? 0,
    is_favorite: metaRow?.is_favorite ?? false,
    notes_md: metaRow?.notes_md ?? null,
    personal_tags: metaRow?.personal_tags ?? [],
    dead_link: metaRow?.dead_link ?? false,
    last_reviewed_at: metaRow?.last_reviewed_at ?? null,
  };

  const { data: versions } = await supabase
    .from("sd_skill_versions")
    .select("id, version, changelog, created_at")
    .eq("skill_id", skill.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const links: Array<{ label: string; href: string }> = [];
  if (skill.homepage_url) links.push({ label: "Homepage ↗", href: skill.homepage_url });
  if (skill.source_url) links.push({ label: "Source ↗", href: skill.source_url });

  return (
    <div>
      <Link href="/skills" style={{ fontSize: 12, color: "var(--bd-text-3)", textDecoration: "none" }}>
        ← Library
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24, marginTop: 12, alignItems: "start" }}>
        <main style={{ minWidth: 0 }}>
          <p className="kicker">{SKILL_TYPE_LABELS[skill.type as SkillType] ?? skill.type}</p>
          <h1 className="display" style={{ fontSize: 32, margin: "4px 0 8px" }}>
            {skill.title}
          </h1>
          {skill.summary && (
            <p style={{ fontSize: 15, color: "var(--bd-text-2)", lineHeight: 1.55, margin: 0 }}>
              {skill.summary}
            </p>
          )}

          {(links.length > 0 || skill.install_command) && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0" }}>
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "var(--accent-ink)", textDecoration: "none", border: "1px solid var(--bd-border)", borderRadius: 999, padding: "6px 12px" }}
                >
                  {l.label}
                </a>
              ))}
            </div>
          )}

          {skill.install_command && (
            <pre
              style={{
                background: "var(--bd-bg-2)",
                border: "1px solid var(--bd-border)",
                borderRadius: "var(--bd-radius-sm)",
                padding: "10px 12px",
                fontSize: 12,
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--bd-text)",
                overflowX: "auto",
              }}
            >
              {skill.install_command}
            </pre>
          )}

          {skill.tags && skill.tags.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "14px 0" }}>
              {skill.tags.map((t: string) => (
                <span key={t} className="bd-chip">
                  {t}
                </span>
              ))}
            </div>
          )}

          {skill.body_mdx && (
            <div
              style={{
                marginTop: 18,
                padding: 16,
                background: "var(--bd-bg-2)",
                border: "1px solid var(--bd-border)",
                borderRadius: "var(--bd-radius)",
                fontSize: 13,
                color: "var(--bd-text-2)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                maxHeight: 420,
                overflowY: "auto",
              }}
            >
              {skill.body_mdx}
            </div>
          )}

          {versions && versions.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <p className="kicker" style={{ marginBottom: 8 }}>
                Versiyonlar
              </p>
              {(versions as VersionRow[]).map((v) => (
                <div key={v.id} style={{ display: "flex", gap: 10, fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--bd-border)" }}>
                  <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--accent-ink)" }}>{v.version}</span>
                  <span style={{ flex: 1, color: "var(--bd-text-2)" }}>{v.changelog ?? ""}</span>
                  <span style={{ color: "var(--bd-text-3)" }}>{v.created_at.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CuratorPanel skillId={skill.id} slug={skill.slug} meta={meta} />
          <Link
            href={`/skills/${skill.slug}/edit`}
            style={{ fontSize: 13, color: "var(--bd-text-2)", textDecoration: "none", textAlign: "center", border: "1px solid var(--bd-border)", borderRadius: 999, padding: "8px 14px" }}
          >
            Skill&apos;i düzenle
          </Link>
        </aside>
      </div>
    </div>
  );
}
