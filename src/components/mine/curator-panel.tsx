"use client";

import { useState, useTransition } from "react";
import {
  saveCuration,
  markReviewed,
  type Curation,
} from "@/app/(owner)/skills/curator-actions";

export interface CuratorMeta {
  curation: Curation;
  priority: number;
  is_favorite: boolean;
  notes_md: string | null;
  personal_tags: string[];
  dead_link: boolean;
  last_reviewed_at: string | null;
}

const CURATIONS: Curation[] = ["inbox", "keep", "watching", "retired"];
const PRIORITIES = [0, 1, 2, 3];

const field: React.CSSProperties = {
  background: "var(--bd-bg-2)",
  color: "var(--bd-text)",
  border: "1px solid var(--bd-border)",
  borderRadius: "var(--bd-radius-sm)",
  padding: "8px 10px",
  fontSize: 13,
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
  marginBottom: 5,
};

/**
 * Curator overlay editor for a skill (writes sd_library_meta). Admin-only —
 * rendered inside the Mine, so it never reaches a non-admin.
 */
export function CuratorPanel({
  skillId,
  slug,
  meta,
}: {
  skillId: string;
  slug: string;
  meta: CuratorMeta;
}) {
  const [curation, setCuration] = useState<Curation>(meta.curation);
  const [priority, setPriority] = useState(meta.priority);
  const [favorite, setFavorite] = useState(meta.is_favorite);
  const [deadLink, setDeadLink] = useState(meta.dead_link);
  const [notes, setNotes] = useState(meta.notes_md ?? "");
  const [tags, setTags] = useState(meta.personal_tags.join(", "));
  const [status, setStatus] = useState<string>("");
  const [pending, start] = useTransition();

  const save = () => {
    setStatus("");
    start(async () => {
      const res = await saveCuration(skillId, slug, {
        curation,
        priority,
        is_favorite: favorite,
        dead_link: deadLink,
        notes_md: notes.trim() || null,
        personal_tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setStatus(res.ok ? "Kaydedildi ✓" : res.error ?? "Hata");
    });
  };

  const review = () => {
    start(async () => {
      const res = await markReviewed(skillId, slug);
      setStatus(res.ok ? "İncelendi olarak işaretlendi ✓" : res.error ?? "Hata");
    });
  };

  return (
    <div
      className="bd-surface"
      style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--bd-text-3)",
          }}
        >
          Curator
        </span>
        <button
          type="button"
          onClick={() => setFavorite((f) => !f)}
          aria-pressed={favorite}
          title="Favori"
          style={{
            background: "transparent",
            border: 0,
            cursor: "pointer",
            fontSize: 18,
            color: favorite ? "var(--accent)" : "var(--bd-text-3)",
            lineHeight: 1,
          }}
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={label}>Durum</label>
          <select style={field} value={curation} onChange={(e) => setCuration(e.target.value as Curation)}>
            {CURATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Öncelik</label>
          <select style={field} value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                P{p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={label}>Kişisel etiketler (virgülle)</label>
        <input style={field} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="örn. favori-mcp, denenecek" />
      </div>

      <div>
        <label style={label}>Notlar</label>
        <textarea
          style={{ ...field, minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bu skill hakkında özel notların…"
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--bd-text-2)" }}>
        <input type="checkbox" checked={deadLink} onChange={(e) => setDeadLink(e.target.checked)} />
        Ölü link / kullanılmıyor
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          style={{
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            border: 0,
            borderRadius: 999,
            padding: "8px 16px",
            fontSize: 13,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? "…" : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={review}
          disabled={pending}
          style={{
            background: "transparent",
            color: "var(--bd-text-2)",
            border: "1px solid var(--bd-border)",
            borderRadius: 999,
            padding: "8px 14px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          İncelendi
        </button>
        {status && (
          <span style={{ fontSize: 12, color: "var(--bd-text-3)" }}>{status}</span>
        )}
      </div>
      {meta.last_reviewed_at && (
        <p style={{ margin: 0, fontSize: 11, color: "var(--bd-text-3)" }}>
          Son inceleme: {meta.last_reviewed_at.slice(0, 10)}
        </p>
      )}
    </div>
  );
}
