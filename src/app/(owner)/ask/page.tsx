import { requireOwner } from "@/lib/owner/auth";
import { PageShell } from "@/lib/owner/page-shell";
import { askBrain } from "@skilldrunk/brain-client";
import type { BrainItem } from "@skilldrunk/brain-client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; realm?: "work" | "personal" | "shared" }>;
}

const inputStyle: React.CSSProperties = {
  background: "var(--bd-bg-2)",
  color: "var(--bd-text)",
  border: "1px solid var(--bd-border)",
  borderRadius: "var(--bd-radius-sm)",
  padding: "11px 14px",
  fontSize: 14,
  flex: 1,
};

export default async function AskPage({ searchParams }: Props) {
  const { supabase } = await requireOwner();
  const { q = "", realm = "work" } = await searchParams;

  let sources: BrainItem[] = [];
  let answer: string | null = null;
  if (q.trim()) {
    const res = await askBrain(supabase, q, { realm, domain: "skilldrunk" });
    sources = res.sources;
    answer = res.answer;
  }

  return (
    <PageShell
      eyebrow="ask brain"
      title="Soru sor"
      description="Geçmiş projeler, kararlar, aktivite üzerinden cevap. Faz 4'te embedding + Claude Haiku sentezi gelir; şu anda FTS sonuçları."
    >
      <form
        method="get"
        style={{ display: "flex", gap: 8, marginBottom: 18 }}
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Örn. Daimler RFI durumu ne?"
          style={inputStyle}
          autoFocus
        />
        <select name="realm" defaultValue={realm} style={{ ...inputStyle, flex: "0 0 130px" }}>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="shared">Shared</option>
        </select>
        <button
          type="submit"
          style={{
            background: "var(--bd-accent)",
            color: "white",
            border: 0,
            borderRadius: 999,
            padding: "0 22px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Sor
        </button>
      </form>

      {answer && (
        <section className="bd-surface" style={{ padding: "16px 18px", marginBottom: 16 }}>
          <p style={{ margin: 0, lineHeight: 1.55, color: "var(--bd-text)" }}>{answer}</p>
        </section>
      )}

      {sources.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--bd-text-3)",
              margin: "0 0 8px 0",
            }}
          >
            kaynaklar ({sources.length})
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {sources.map((s) => (
              <li key={s.id} className="bd-surface" style={{ padding: "10px 14px" }}>
                <a
                  className="bd-link"
                  href={s.slug ? `/catalog/${s.slug}` : s.url ?? "#"}
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  {s.title}
                </a>
                {s.subtitle && (
                  <p style={{ fontSize: 12, color: "var(--bd-text-2)", margin: "2px 0 0 0" }}>
                    {s.subtitle}
                  </p>
                )}
                <p style={{ fontSize: 10, color: "var(--bd-text-3)", margin: "4px 0 0 0", fontFamily: "var(--bd-font-mono)" }}>
                  {s.source} · {s.realm} · {s.kind}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q.trim() && sources.length === 0 && !answer && (
        <p style={{ fontSize: 13, color: "var(--bd-text-2)" }}>
          "{q}" için sonuç yok. brain_items'a daha fazla içerik gelince doluyor olacak.
        </p>
      )}
    </PageShell>
  );
}
