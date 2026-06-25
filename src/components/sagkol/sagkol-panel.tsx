"use client";

import { useEffect, useRef, useState } from "react";
import { useSagkolChat, type ChatItem } from "./use-sagkol-chat";
import { PERSONAS, DEFAULT_PERSONA, type Persona } from "./personas";

const TOOL_LABELS: Record<string, string> = {
  query_kanban_cards: "kartları sorguluyor",
  query_oz_notes: "notları okuyor",
  get_board_stats: "istatistik çıkarıyor",
  list_my_meetings: "toplantıları buluyor",
  what_if: "simüle ediyor",
  get_audit_log: "geçmişe bakıyor",
  ui_command: "board'u sürüyor",
  propose_mutation: "değişiklik öneriyor",
};

export function SagkolPanel({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);
  const [input, setInput] = useState("");
  const { items, busy, thinking, cacheHit, send, resolveProposal, reset } = useSagkolChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdmin = userRole === "admin";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items, thinking]);

  function submit() {
    const t = input.trim();
    if (!t || busy) return;
    setInput("");
    void send(t);
  }

  return (
    <>
      {/* ── Floating buton ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Sağkol'u aç"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 300,
            width: 60, height: 60, borderRadius: "50%", border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${persona.accent}, var(--gold, #ffd700))`,
            boxShadow: `0 4px 24px ${persona.accent}66, 0 0 40px ${persona.accent}22`,
            fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {persona.avatar}
        </button>
      )}

      {/* ── Overlay panel ── */}
      {open && (
        <div
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 300,
            width: "min(420px, calc(100vw - 32px))", height: "min(640px, calc(100vh - 48px))",
            display: "flex", flexDirection: "column",
            background: "var(--bg2, #0d1117)", border: "1px solid var(--card-border, rgba(240,160,48,0.15))",
            borderRadius: 18, overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)",
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: "1px solid var(--card-border, rgba(240,160,48,0.15))", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26, filter: `drop-shadow(0 0 8px ${persona.accent}66)` }}>{persona.avatar}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "var(--text-bright, #fff8e7)", fontSize: 15 }}>
                  {persona.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim, #8a7e6a)" }}>
                  {persona.title} · {userName} ({isAdmin ? "admin" : "read-only"})
                </div>
              </div>
              {cacheHit && (
                <span title="prompt cache aktif" style={{ fontSize: 10, color: "var(--green, #40c057)" }}>⚡cache</span>
              )}
              <button onClick={reset} title="Yeni sohbet" style={iconBtn}>↺</button>
              <button onClick={() => setOpen(false)} title="Kapat" style={iconBtn}>✕</button>
            </div>
            {/* Avatar seçici */}
            <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto" }}>
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p)}
                  title={`${p.name} — ${p.title}`}
                  style={{
                    flexShrink: 0, width: 34, height: 34, borderRadius: "50%", cursor: "pointer", fontSize: 17,
                    background: persona.id === p.id ? `${p.accent}22` : "var(--bg3, #151b25)",
                    border: `1px solid ${persona.id === p.id ? p.accent : "transparent"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {p.avatar}
                </button>
              ))}
            </div>
          </div>

          {/* Mesajlar */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {items.length === 0 && (
              <div style={{ color: "var(--text-dim, #8a7e6a)", fontSize: 13, lineHeight: 1.6 }}>
                {persona.greeting}
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {["Bu haftaki P0'ları göster", "Erdinç'in işleri neler?", "Durum özeti ver", "Yaklaşan toplantılarım"].map((s) => (
                    <button key={s} onClick={() => { setInput(""); void send(s); }} style={suggestionBtn}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {items.map((it, i) => (
              <Bubble key={i} item={it} accent={persona.accent} isAdmin={isAdmin} onResolve={resolveProposal} />
            ))}
            {thinking && <div style={{ fontSize: 12, color: "var(--text-dim, #8a7e6a)", fontStyle: "italic" }}>{persona.name} düşünüyor…</div>}
          </div>

          {/* Girdi */}
          <div style={{ borderTop: "1px solid var(--card-border, rgba(240,160,48,0.15))", padding: 10, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder={isAdmin ? "Sor veya komut ver…" : "Sor (read-only)…"}
              disabled={busy}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none",
                background: "var(--bg3, #151b25)", color: "var(--text, #e0d8c8)",
                border: "1px solid var(--card-border, rgba(240,160,48,0.15))",
              }}
            />
            <button
              onClick={submit}
              disabled={busy || !input.trim()}
              style={{
                padding: "0 16px", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer",
                background: busy ? "var(--bg3, #151b25)" : `linear-gradient(135deg, ${persona.accent}, var(--gold, #ffd700))`,
                color: "#07090f", fontWeight: 700, opacity: busy || !input.trim() ? 0.5 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const iconBtn: React.CSSProperties = {
  background: "none", border: "none", color: "var(--text-dim, #8a7e6a)", cursor: "pointer", fontSize: 15, padding: 4,
};
const suggestionBtn: React.CSSProperties = {
  textAlign: "left", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, cursor: "pointer",
  background: "var(--bg3, #151b25)", color: "var(--text, #e0d8c8)",
  border: "1px solid var(--card-border, rgba(240,160,48,0.15))",
};

function Bubble({
  item,
  accent,
  isAdmin,
  onResolve,
}: {
  item: ChatItem;
  accent: string;
  isAdmin: boolean;
  onResolve: (item: Extract<ChatItem, { kind: "proposal" }>, decision: "confirm" | "reject") => void;
}) {
  if (item.kind === "user") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "85%", background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: "12px 12px 2px 12px", padding: "8px 12px", fontSize: 13.5, color: "var(--text-bright, #fff8e7)" }}>
        {item.text}
      </div>
    );
  }
  if (item.kind === "assistant") {
    return (
      <div style={{ alignSelf: "flex-start", maxWidth: "90%", fontSize: 13.5, color: "var(--text, #e0d8c8)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {item.text}
      </div>
    );
  }
  if (item.kind === "tool") {
    return (
      <div style={{ alignSelf: "flex-start", fontSize: 11.5, color: item.isError ? "var(--fire, #ff4444)" : "var(--text-dim, #8a7e6a)", display: "flex", alignItems: "center", gap: 6 }}>
        <span>{item.done ? (item.isError ? "✕" : "✓") : "⋯"}</span>
        <span>{TOOL_LABELS[item.name] ?? item.name}{item.summary ? ` — ${item.summary}` : ""}</span>
      </div>
    );
  }
  if (item.kind === "error") {
    return (
      <div style={{ alignSelf: "flex-start", maxWidth: "90%", fontSize: 12.5, color: "var(--fire, #ff4444)", background: "rgba(255,68,68,0.08)", borderRadius: 8, padding: "8px 12px" }}>
        ⚠ {item.message}
      </div>
    );
  }
  // proposal
  const p = item.proposal;
  return (
    <div style={{ alignSelf: "flex-start", width: "92%", background: "var(--bg3, #151b25)", border: `1px solid ${accent}55`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: accent, marginBottom: 6 }}>👑 Onay Gerekli</div>
      <div style={{ fontSize: 13, color: "var(--text-bright, #fff8e7)", marginBottom: 8 }}>{p.summaryTr}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {p.operations.map((op, i) => (
          <div key={i} style={{ fontSize: 11.5, color: "var(--text-dim, #8a7e6a)", fontFamily: "monospace" }}>
            • {op.op}{"entity_id" in op && op.entity_id ? ` (${op.entity_id.slice(0, 8)})` : ""} — {op.reason}
          </div>
        ))}
      </div>
      {item.resolved ? (
        <div style={{ fontSize: 12, color: item.resolved === "confirmed" ? "var(--green, #40c057)" : "var(--text-dim, #8a7e6a)" }}>
          {item.resolved === "confirmed" ? "✓" : "✕"} {item.resultNote}
        </div>
      ) : isAdmin ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onResolve(item, "confirm")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--green, #40c057)", color: "#07090f", fontWeight: 700, fontSize: 12.5 }}>
            ✓ Onayla
          </button>
          <button onClick={() => onResolve(item, "reject")} style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", color: "var(--text-dim, #8a7e6a)", border: "1px solid var(--card-border, rgba(240,160,48,0.15))", fontSize: 12.5 }}>
            Reddet
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: "var(--text-dim, #8a7e6a)" }}>Onaylamak için admin girişi gerekli.</div>
      )}
    </div>
  );
}
