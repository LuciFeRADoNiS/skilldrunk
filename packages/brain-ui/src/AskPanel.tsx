"use client";

import { useState, useRef, useEffect } from "react";

export interface AskPanelSource {
  id: string;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  source?: string;
  realm?: string;
  similarity?: number;
}

export interface AskPanelProps {
  /** POST endpoint that streams SSE chunks (see /api/brain/ask). */
  endpoint?: string; // default "/api/brain/ask"
  /** Default realm in the toggle. */
  defaultRealm?: "work" | "personal" | "shared";
  /** Which realms to show in the toggle. */
  realms?: Array<"work" | "personal" | "shared">;
  /** Placeholder for the textarea. */
  placeholder?: string;
  /** Brand color for the submit button & accent. Defaults to var(--bd-accent). */
  accent?: string;
}

interface SseChunk {
  type: "sources" | "delta" | "done" | "error";
  sources?: AskPanelSource[];
  delta?: string;
  error?: string;
}

const HISTORY_KEY = "brain-ui:ask-history";
const HISTORY_MAX = 20;

interface HistoryItem {
  q: string;
  realm: string;
  at: string;
}

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(items.slice(0, HISTORY_MAX)),
    );
  } catch {
    /* quota — silent */
  }
}

/**
 * Streaming Ask Brain panel — client component.
 * D-018 ihlali yok: server endpoint /api/brain/ask Haiku stream; bu component
 * sadece SSE'yi parse eder ve render. localStorage history (D-036 v1, cloud
 * sync v2).
 */
export function AskPanel({
  endpoint = "/api/brain/ask",
  defaultRealm = "work",
  realms = ["work", "personal", "shared"],
  placeholder = "Bir şey sor — geçmiş projeler, kararlar, aktivite üzerinden cevap.",
  accent,
}: AskPanelProps) {
  const [query, setQuery] = useState("");
  const [realm, setRealm] = useState<"work" | "personal" | "shared">(defaultRealm);
  const [streaming, setStreaming] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AskPanelSource[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || streaming) return;

    // Cancel any in-flight
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStreaming(true);
    setAnswer("");
    setSources([]);
    setErrorMsg(null);

    const newItem: HistoryItem = { q, realm, at: new Date().toISOString() };
    const next = [newItem, ...history.filter((h) => h.q !== q)].slice(0, HISTORY_MAX);
    setHistory(next);
    saveHistory(next);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, realm }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const line = p.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const chunk: SseChunk = JSON.parse(line.slice(6));
            if (chunk.type === "sources" && chunk.sources) setSources(chunk.sources);
            else if (chunk.type === "delta" && chunk.delta) setAnswer((s) => s + chunk.delta);
            else if (chunk.type === "error" && chunk.error) setErrorMsg(chunk.error);
            // 'done' → final usage; ignored for UI
          } catch {
            /* skip malformed */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const submitBg = accent ?? "var(--bd-accent)";

  return (
    <div className="bd-ask-panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            background: "var(--bd-bg-2)",
            color: "var(--bd-text)",
            border: "1px solid var(--bd-border)",
            borderRadius: "var(--bd-radius-sm)",
            padding: "11px 14px",
            fontSize: 14,
            resize: "vertical",
            fontFamily: "inherit",
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(e as unknown as React.FormEvent);
          }}
          disabled={streaming}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {realms.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRealm(r)}
                aria-pressed={realm === r}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  borderRadius: 999,
                  border: "1px solid var(--bd-border)",
                  background: realm === r ? "var(--bd-accent-bg)" : "transparent",
                  color: realm === r ? "var(--bd-accent-2)" : "var(--bd-text-2)",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {streaming && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                style={{
                  background: "transparent",
                  border: "1px solid var(--bd-border)",
                  color: "var(--bd-text-2)",
                  borderRadius: 999,
                  padding: "5px 14px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Durdur
              </button>
            )}
            <button
              type="submit"
              disabled={streaming || !query.trim()}
              style={{
                background: submitBg,
                color: "white",
                border: 0,
                borderRadius: 999,
                padding: "7px 20px",
                fontSize: 13,
                cursor: streaming || !query.trim() ? "not-allowed" : "pointer",
                opacity: streaming || !query.trim() ? 0.55 : 1,
              }}
            >
              {streaming ? "Düşünüyor…" : "Sor"}
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 10, color: "var(--bd-text-3)", fontFamily: "var(--bd-font-mono)" }}>
          ⌘/Ctrl+Enter = gönder
        </p>
      </form>

      {errorMsg && (
        <div
          className="bd-surface"
          style={{
            padding: "10px 14px",
            borderColor: "var(--bd-danger)",
            color: "var(--bd-danger)",
            fontSize: 13,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {(answer || streaming) && (
        <section
          className="bd-surface"
          style={{
            padding: "14px 16px",
            whiteSpace: "pre-wrap",
            lineHeight: 1.55,
            color: "var(--bd-text)",
            fontSize: 14,
            minHeight: 60,
          }}
        >
          {answer}
          {streaming && (
            <span aria-hidden style={{ marginLeft: 4, color: "var(--bd-accent-2)" }}>
              ▍
            </span>
          )}
        </section>
      )}

      {sources.length > 0 && (
        <section>
          <h3
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--bd-text-3)",
              margin: "0 0 6px 0",
              fontFamily: "var(--bd-font-mono)",
            }}
          >
            kaynaklar · {sources.length}
          </h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {sources.map((s) => (
              <li key={s.id} className="bd-surface" style={{ padding: "8px 12px" }}>
                <a
                  href={s.url ?? "#"}
                  className="bd-link"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {s.title}
                  {typeof s.similarity === "number" && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        color: "var(--bd-text-3)",
                        fontFamily: "var(--bd-font-mono)",
                      }}
                    >
                      {(s.similarity * 100).toFixed(0)}%
                    </span>
                  )}
                </a>
                {s.subtitle && (
                  <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--bd-text-2)" }}>{s.subtitle}</p>
                )}
                {(s.source || s.realm) && (
                  <p
                    style={{
                      margin: "3px 0 0 0",
                      fontSize: 9,
                      color: "var(--bd-text-3)",
                      fontFamily: "var(--bd-font-mono)",
                    }}
                  >
                    {[s.source, s.realm].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section style={{ marginTop: 6 }}>
          <h3
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--bd-text-3)",
              margin: "0 0 6px 0",
              fontFamily: "var(--bd-font-mono)",
            }}
          >
            geçmiş · localStorage · {history.length}
          </h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {history.slice(0, 8).map((h) => (
              <li key={h.at}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(h.q);
                    setRealm(h.realm as "work" | "personal" | "shared");
                  }}
                  title={`${h.realm} · ${new Date(h.at).toLocaleString("tr-TR")}`}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--bd-border)",
                    color: "var(--bd-text-2)",
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    maxWidth: 240,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h.q}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
