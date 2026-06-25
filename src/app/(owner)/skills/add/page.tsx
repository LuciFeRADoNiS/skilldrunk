import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/owner/auth";
import { SKILL_TYPE_LABELS, type SkillType } from "@/lib/types";

const TYPES: SkillType[] = ["mcp_server", "claude_skill", "gpt", "cursor_rule", "prompt", "agent"];

async function createSkill(formData: FormData) {
  "use server";
  const { supabase, user } = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Başlık zorunlu");
  const type = String(formData.get("type") ?? "mcp_server") as SkillType;
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const homepage_url = String(formData.get("homepage_url") ?? "").trim() || null;
  const source_url = String(formData.get("source_url") ?? "").trim() || null;
  const install_command = String(formData.get("install_command") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56)}-${Math.floor(
    Date.now() / 1000,
  )
    .toString(36)
    .slice(-4)}`;

  const { data, error } = await supabase
    .from("sd_skills")
    .insert({
      title,
      slug,
      type,
      summary,
      body_mdx: summary ?? title,
      homepage_url,
      source_url,
      install_command,
      category,
      tags,
      status: "draft",
      author_id: user.id,
      metadata: {},
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(`insert: ${error.message}`);

  // best-effort curator overlay (ignored if migration 0024 isn't applied yet)
  await supabase
    .from("sd_library_meta")
    .insert({ skill_id: data.id, source_kind: "manual" });

  redirect(`/skills/${data.slug}`);
}

const field: React.CSSProperties = {
  background: "var(--bd-bg-2)",
  color: "var(--bd-text)",
  border: "1px solid var(--bd-border)",
  borderRadius: "var(--bd-radius-sm)",
  padding: "10px 12px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};
const label: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--bd-text-3)",
  marginBottom: 6,
};

export const dynamic = "force-dynamic";

export default async function SkillAddPage() {
  await requireAdmin();
  return (
    <div style={{ maxWidth: 560 }}>
      <p className="kicker">library · ekle</p>
      <h1 className="display" style={{ fontSize: 26, margin: "2px 0 18px" }}>
        Kütüphaneye skill ekle
      </h1>
      <form action={createSkill} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={label} htmlFor="title">Başlık *</label>
          <input id="title" name="title" required style={field} placeholder="örn. Playwright MCP" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={label} htmlFor="type">Tip</label>
            <select id="type" name="type" style={field} defaultValue="mcp_server">
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {SKILL_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label} htmlFor="category">Kategori</label>
            <input id="category" name="category" style={field} placeholder="örn. dev-tools" />
          </div>
        </div>
        <div>
          <label style={label} htmlFor="summary">Özet</label>
          <textarea id="summary" name="summary" rows={3} style={{ ...field, resize: "vertical", fontFamily: "inherit" }} placeholder="1-2 cümle" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={label} htmlFor="homepage_url">Homepage</label>
            <input id="homepage_url" name="homepage_url" type="url" style={field} placeholder="https://" />
          </div>
          <div>
            <label style={label} htmlFor="source_url">Source</label>
            <input id="source_url" name="source_url" type="url" style={field} placeholder="https://github.com/…" />
          </div>
        </div>
        <div>
          <label style={label} htmlFor="install_command">Install komutu</label>
          <input id="install_command" name="install_command" style={field} placeholder="npx ..." />
        </div>
        <div>
          <label style={label} htmlFor="tags">Etiketler (virgülle)</label>
          <input id="tags" name="tags" style={field} placeholder="mcp, browser, automation" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <a href="/skills" style={{ padding: "9px 14px", fontSize: 13, color: "var(--bd-text-2)", textDecoration: "none" }}>
            İptal
          </a>
          <button type="submit" style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: 0, borderRadius: 999, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>
            Ekle (draft)
          </button>
        </div>
      </form>
    </div>
  );
}
