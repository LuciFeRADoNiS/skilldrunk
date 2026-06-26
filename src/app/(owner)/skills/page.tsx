import Link from "next/link";
import { requireAdmin } from "@/lib/owner/auth";
import { SKILL_TYPE_LABELS, type SkillType } from "@/lib/types";
import type { Curation } from "./curator-actions";

export const dynamic = "force-dynamic";

interface SkillRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  type: SkillType;
  tags: string[] | null;
  score: number | null;
  status: string;
  updated_at: string;
}
interface MetaRow {
  skill_id: string;
  curation: Curation;
  priority: number;
  is_favorite: boolean;
  dead_link: boolean;
}

const CURATIONS: Curation[] = ["inbox", "keep", "watching", "retired"];
const TYPES: SkillType[] = ["mcp_server", "claude_skill", "gpt", "cursor_rule", "prompt", "agent"];

function Chip({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: "5px 11px",
        borderRadius: 999,
        fontSize: 12,
        textDecoration: "none",
        border: "1px solid var(--bd-border)",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent-ink)" : "var(--bd-text-2)",
      }}
    >
      {children}
    </Link>
  );
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; curation?: string; fav?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;

  const { data: skills } = await supabase
    .from("sd_skills")
    .select("id, slug, title, summary, type, tags, score, status, updated_at")
    .neq("status", "archived")
    .limit(300);

  // Curator overlay — resilient: returns error (not throw) if 0024 isn't applied.
  const overlay = new Map<string, MetaRow>();
  const { data: meta } = await supabase
    .from("sd_library_meta")
    .select("skill_id, curation, priority, is_favorite, dead_link");
  if (meta) for (const m of meta as MetaRow[]) overlay.set(m.skill_id, m);

  let rows = (skills ?? []) as SkillRow[];
  const total = rows.length;
  if (sp.type) rows = rows.filter((r) => r.type === sp.type);
  if (sp.curation) rows = rows.filter((r) => (overlay.get(r.id)?.curation ?? "inbox") === sp.curation);
  if (sp.fav) rows = rows.filter((r) => overlay.get(r.id)?.is_favorite);
  rows.sort(
    (a, b) =>
      (overlay.get(b.id)?.priority ?? 0) - (overlay.get(a.id)?.priority ?? 0) ||
      (a.updated_at < b.updated_at ? 1 : -1),
  );

  const qs = (patch: Record<string, string | undefined>) => {
    const next = { ...sp, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/skills?${s}` : "/skills";
  };

  return (
    <div>
      <header style={{ marginBottom: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p className="kicker">library · {total} skill</p>
          <h1 className="display" style={{ fontSize: 30, margin: "2px 0 0" }}>
            The Cellar
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/skills/ask" style={{ fontSize: 13, color: "var(--bd-text-2)", textDecoration: "none", border: "1px solid var(--bd-border)", borderRadius: 999, padding: "8px 14px" }}>
            ✦ Sor
          </Link>
          <Link href="/skills/add" style={{ fontSize: 13, color: "var(--accent-contrast)", background: "var(--accent)", textDecoration: "none", borderRadius: 999, padding: "8px 16px" }}>
            + Ekle
          </Link>
        </div>
      </header>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <Chip active={!sp.type} href={qs({ type: undefined })}>Hepsi</Chip>
        {TYPES.map((t) => (
          <Chip key={t} active={sp.type === t} href={qs({ type: t })}>
            {SKILL_TYPE_LABELS[t]}
          </Chip>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {CURATIONS.map((c) => (
          <Chip key={c} active={sp.curation === c} href={qs({ curation: sp.curation === c ? undefined : c })}>
            {c}
          </Chip>
        ))}
        <Chip active={!!sp.fav} href={qs({ fav: sp.fav ? undefined : "1" })}>★ favori</Chip>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: "var(--bd-text-3)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
          The cellar&apos;s empty. Time to pour something in.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {rows.map((s) => {
            const m = overlay.get(s.id);
            return (
              <Link
                key={s.id}
                href={`/skills/${s.slug}`}
                className="bd-surface"
                style={{
                  padding: 16,
                  textDecoration: "none",
                  color: "var(--bd-text)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  opacity: m?.dead_link ? 0.55 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="kicker">{SKILL_TYPE_LABELS[s.type] ?? s.type}</span>
                  {m?.is_favorite && <span style={{ color: "var(--accent)" }}>★</span>}
                </div>
                <span className="display" style={{ fontSize: 18, lineHeight: 1.15 }}>
                  {s.title}
                </span>
                {s.summary && (
                  <span style={{ fontSize: 13, color: "var(--bd-text-2)", lineHeight: 1.45 }}>
                    {s.summary.length > 110 ? `${s.summary.slice(0, 110)}…` : s.summary}
                  </span>
                )}
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--bd-text-3)" }}>
                  {m && m.priority > 0 && <span className="bd-chip">P{m.priority}</span>}
                  <span>{m?.curation ?? "inbox"}</span>
                  {s.status !== "published" && <span>· {s.status}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
