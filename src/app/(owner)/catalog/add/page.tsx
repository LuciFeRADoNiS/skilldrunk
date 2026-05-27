import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/owner/auth";

// D-017: Form v1. CSV import Faz 2.5 (D-017 ertelenmiş kısmı).

async function createItem(formData: FormData) {
  "use server";
  const { supabase } = await requireOwner();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title zorunlu");

  const kind = String(formData.get("kind") ?? "project");
  const source = String(formData.get("source") ?? "manual");
  const realm = String(formData.get("realm") ?? "shared");
  const url = String(formData.get("url") ?? "").trim() || null;
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;

  // slug: lower-case, dashes
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const visibility = {
    visible_skilldrunk: realm === "work" || realm === "shared",
    visible_skimsoulfat: realm === "personal" || realm === "shared",
  };

  const { data, error } = await supabase
    .from("brain_items")
    .insert({
      title,
      slug,
      kind,
      source,
      realm,
      url,
      subtitle,
      description,
      category,
      status: "active",
      external_id: `manual:${slug}`,
      ...visibility,
    })
    .select("slug")
    .single();

  if (error) throw new Error(`insert: ${error.message}`);

  redirect(`/catalog/${data.slug}`);
}

const inputStyle: React.CSSProperties = {
  background: "var(--bd-bg-2)",
  color: "var(--bd-text)",
  border: "1px solid var(--bd-border)",
  borderRadius: "var(--bd-radius-sm)",
  padding: "10px 12px",
  fontSize: 14,
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--bd-text-3)",
  marginBottom: 6,
};

export default async function CatalogAddPage() {
  await requireOwner();
  return (
    <div style={{ maxWidth: 560 }}>
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
        catalog · manuel ekle
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 18px 0" }}>
        Yeni item
      </h1>
      <form action={createItem} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle} htmlFor="title">Başlık *</label>
          <input id="title" name="title" required style={inputStyle} placeholder="Örn. Lovable Landing Page" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="subtitle">Subtitle</label>
          <input id="subtitle" name="subtitle" style={inputStyle} placeholder="Kısa altyazı" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="url">URL</label>
          <input id="url" name="url" type="url" style={inputStyle} placeholder="https://..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle} htmlFor="kind">Tip</label>
            <select id="kind" name="kind" style={inputStyle} defaultValue="external_app">
              <option value="project">project</option>
              <option value="prototype">prototype</option>
              <option value="tool">tool</option>
              <option value="bot">bot</option>
              <option value="note">note</option>
              <option value="external_app">external_app</option>
              <option value="service">service</option>
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="source">Kaynak</label>
            <select id="source" name="source" style={inputStyle} defaultValue="manual">
              <option value="manual">manual</option>
              <option value="lovable">lovable</option>
              <option value="replit">replit</option>
              <option value="google_ai_studio">google_ai_studio</option>
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="realm">Realm</label>
            <select id="realm" name="realm" style={inputStyle} defaultValue="shared">
              <option value="work">work</option>
              <option value="personal">personal</option>
              <option value="shared">shared</option>
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle} htmlFor="category">Kategori</label>
          <input id="category" name="category" style={inputStyle} placeholder="örn. marketplace, internal-tool" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="description">Açıklama</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            placeholder="2-3 cümle, neden var, ne işe yarar"
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <a
            href="/catalog"
            style={{
              padding: "9px 14px",
              fontSize: 13,
              color: "var(--bd-text-2)",
              textDecoration: "none",
            }}
          >
            İptal
          </a>
          <button
            type="submit"
            style={{
              background: "var(--bd-accent)",
              color: "white",
              border: 0,
              borderRadius: 999,
              padding: "9px 18px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Ekle
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--bd-text-3)", margin: 0 }}>
          CSV import ileride gelecek (D-017 — Form v1 önce).
        </p>
      </form>
    </div>
  );
}
