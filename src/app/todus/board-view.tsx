"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { TodusCard } from "./page";
import { moveCard, addCard } from "./actions";
import { SagkolPanel } from "@/components/sagkol/sagkol-panel";
import type { TodusUiCommand } from "@/lib/sagkol/types";

/* ── Sabitler (orijinal public/todos tasarımından) ── */

const COLUMNS = [
  { db: "Backlog", label: "📥 Backlog", cls: "backlog" },
  { db: "Todo", label: "⚡ Todo", cls: "active" },
  { db: "In Progress", label: "🔧 In Progress", cls: "progress" },
  { db: "Review", label: "👁 Review", cls: "review" },
  { db: "Done", label: "✅ Done", cls: "done" },
] as const;

const CAT_CONFIG: Record<string, { icon: string; label: string }> = {
  all: { icon: "👑", label: "Tümü" },
  enco: { icon: "🚛", label: "ENCO" },
  movetech: { icon: "📦", label: "MoveTech" },
  ai: { icon: "🤖", label: "AI/Tech" },
  marketing: { icon: "📣", label: "Marketing" },
  futurecode: { icon: "💻", label: "FutureCode" },
  greenx: { icon: "🌱", label: "GreenX" },
  hukuk: { icon: "⚖️", label: "Hukuk" },
  personal: { icon: "🎮", label: "Kişisel" },
  other: { icon: "🗂", label: "Diğer" },
};

const PRIORITY_LABELS: Record<string, string> = {
  P0: "🔥 P0 Kritik",
  P1: "🔴 P1 Yüksek",
  P2: "🟡 P2 Orta",
  P3: "⚪ P3 Düşük",
};

const PER_COLUMN_CAP = 60;

/** Kartın label'larından orijinal kategori sistemine eşleme */
function deriveCategory(labels: string[]): string {
  const joined = labels.join(" ").toLowerCase();
  if (/movetech|mirlog|mt-/.test(joined)) return "movetech";
  if (/greenix|greenx|tofas/.test(joined)) return "greenx";
  if (/future-?code/.test(joined)) return "futurecode";
  if (/hukuk|kvkk|sözleşme|vekalet|e-imza|denetim/.test(joined)) return "hukuk";
  if (/claude|chatbot|copilot|mcp|zapier|botpress|notebook|agent|gpt|ai-/.test(joined) || labels.includes("ai"))
    return "ai";
  if (/marketing|adwords|mailing|seo|fuar|linkedin|instagram|banner|carousel/.test(joined))
    return "marketing";
  if (/kişisel|personal|reçete|abonelik|kitap/.test(joined)) return "personal";
  if (/enco/.test(joined)) return "enco";
  return "other";
}

function dueClass(due: string | null): string {
  if (!due) return "";
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  if (due < today) return "overdue";
  if (due <= week) return "soon";
  return "";
}

/* ── Ana bileşen ── */

export function TodusApp({
  cards: initialCards,
  canEdit,
  isLoggedIn,
  loadError,
  userName = "Ziyaretçi",
  userRole = "guest",
}: {
  cards: TodusCard[];
  canEdit: boolean;
  isLoggedIn: boolean;
  loadError: string | null;
  userName?: string;
  userRole?: string;
}) {
  const [cards, setCards] = useState(initialCards);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"board" | "timeline">("board");
  const [priorityFilter, setPriorityFilter] = useState(false);
  const [activeCat, setActiveCat] = useState("all");
  const [selected, setSelected] = useState<TodusCard | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  // Sağkol komut köprüsü için ek filtreler + vurgu
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [columnFilter, setColumnFilter] = useState<string | null>(null);
  const [priorityExact, setPriorityExact] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const withCat = useMemo(
    () => cards.map((c) => ({ ...c, cat: deriveCategory(c.labels) })),
    [cards],
  );

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of withCat) m.set(c.cat, (m.get(c.cat) ?? 0) + 1);
    return m;
  }, [withCat]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return withCat.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q) && !(c.description ?? "").toLowerCase().includes(q) && !c.assignee.toLowerCase().includes(q) && !c.labels.some((l) => l.toLowerCase().includes(q)))
        return false;
      if (priorityFilter && !["P0", "P1"].includes(c.priority)) return false;
      if (activeCat !== "all" && c.cat !== activeCat) return false;
      if (assigneeFilter && c.assignee.toLowerCase() !== assigneeFilter.toLowerCase()) return false;
      if (columnFilter && c.column_name !== columnFilter) return false;
      if (priorityExact && c.priority !== priorityExact) return false;
      return true;
    });
  }, [withCat, search, priorityFilter, activeCat, assigneeFilter, columnFilter, priorityExact]);

  /* ── Sağkol komut köprüsü: ZeuX board'u sürer (filter/highlight/set_view) ── */
  useEffect(() => {
    function onCmd(e: Event) {
      const cmd = (e as CustomEvent<TodusUiCommand>).detail;
      if (!cmd) return;
      if (cmd.command === "filter") {
        if (cmd.search !== undefined) setSearch(cmd.search);
        if (cmd.assignee !== undefined) setAssigneeFilter(cmd.assignee || null);
        if (cmd.column !== undefined) setColumnFilter(cmd.column || null);
        if (cmd.priority !== undefined) setPriorityExact(cmd.priority || null);
        if (cmd.label !== undefined) setSearch(cmd.label || "");
        setView("board");
      } else if (cmd.command === "clear_filter") {
        setSearch(""); setAssigneeFilter(null); setColumnFilter(null);
        setPriorityExact(null); setPriorityFilter(false); setActiveCat("all");
      } else if (cmd.command === "set_view") {
        if (cmd.view) setView(cmd.view);
      } else if (cmd.command === "highlight_card" && cmd.cardId) {
        setHighlightId(cmd.cardId);
        const card = cards.find((c) => c.id === cmd.cardId);
        if (card) setSelected(card);
        setTimeout(() => setHighlightId(null), 3500);
      }
    }
    window.addEventListener("sagkol:todus", onCmd as EventListener);
    return () => window.removeEventListener("sagkol:todus", onCmd as EventListener);
  }, [cards]);

  /* Ekran durumunu Sağkol'a aç (turn context için) */
  useEffect(() => {
    (window as unknown as { __todusScreen?: unknown }).__todusScreen = {
      view,
      filter: {
        ...(search ? { search } : {}),
        ...(assigneeFilter ? { assignee: assigneeFilter } : {}),
        ...(columnFilter ? { column: columnFilter } : {}),
        ...(priorityExact ? { priority: priorityExact } : {}),
        ...(priorityFilter ? { p0p1: true } : {}),
        ...(activeCat !== "all" ? { category: activeCat } : {}),
      },
    };
  }, [view, search, assigneeFilter, columnFilter, priorityExact, priorityFilter, activeCat]);

  /* Header istatistikleri */
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const week = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const month = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const active = withCat.filter((c) => ["Todo", "In Progress", "Review"].includes(c.column_name)).length;
    return {
      total: withCat.length,
      active,
      done: withCat.filter((c) => c.column_name === "Done").length,
      p0: withCat.filter((c) => c.priority === "P0" && c.column_name !== "Done").length,
      dueToday: withCat.filter((c) => c.due_date === today && c.column_name !== "Done").length,
      dueWeek: withCat.filter((c) => c.due_date && c.due_date >= today && c.due_date <= week && c.column_name !== "Done").length,
      dueMonth: withCat.filter((c) => c.due_date && c.due_date >= today && c.due_date <= month && c.column_name !== "Done").length,
      backlog: withCat.filter((c) => c.column_name === "Backlog").length,
      inProgress: withCat.filter((c) => c.column_name === "In Progress").length,
    };
  }, [withCat]);

  function handleMove(card: TodusCard, target: string) {
    startTransition(async () => {
      const res = await moveCard(card.id, target);
      if (res.ok) {
        setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, column_name: target } : c)));
        setSelected((s) => (s && s.id === card.id ? { ...s, column_name: target } : s));
      } else {
        alert(`Taşınamadı: ${res.error}`);
      }
    });
  }

  const timelineCards = useMemo(
    () => filtered.filter((c) => c.due_date && c.column_name !== "Done").sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)),
    [filtered],
  );

  return (
    <div className="todus">
      <div className="bg-grid" />
      <div className="amber-orb amber-orb-1" />
      <div className="amber-orb amber-orb-2" />

      <div className="app">
        {/* ── Header ── */}
        <header className="header">
          <div className="logo">
            <span className="logo-crown">👑</span>
            <div>
              <div className="logo-text glow-amber">tÖdÜs</div>
              <div className="logo-sub">brain system v2.0 — live</div>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-box"><div className="stat-num">{stats.total}</div><div className="stat-label">Toplam</div></div>
            <div className="stat-box"><div className="stat-num">{stats.active}</div><div className="stat-label">Aktif</div></div>
            <div className="stat-box"><div className="stat-num">{stats.done}</div><div className="stat-label">Tamamlanan</div></div>
            <div className="stat-box"><div className="stat-num">{stats.p0}</div><div className="stat-label">🔥 P0</div></div>
          </div>
        </header>

        {loadError || (!isLoggedIn && cards.length === 0) ? (
          <div className="notice">
            {loadError
              ? `Kartlar yüklenemedi: ${loadError}`
              : "Kartları görmek için giriş gerekli."}{" "}
            <a href="/login">→ Giriş yap</a>
          </div>
        ) : null}

        {/* ── Controls ── */}
        <div className="controls">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-box"
              placeholder="Ara... (görev, tag, kişi)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className={`view-btn ${view === "board" ? "active" : ""}`} onClick={() => setView("board")}>📋 Kanban</button>
          <button className={`view-btn ${view === "timeline" ? "active" : ""}`} onClick={() => setView("timeline")}>📅 Timeline</button>
          <button className={`filter-btn ${priorityFilter ? "active" : ""}`} onClick={() => setPriorityFilter((v) => !v)}>🔥 P0/P1</button>
          {canEdit && (
            <button className="filter-btn" onClick={() => setShowAdd(true)}>+ Yeni</button>
          )}
        </div>

        {/* ── Category Tabs ── */}
        <div className="cat-tabs">
          {Object.entries(CAT_CONFIG)
            .filter(([key]) => key === "all" || (catCounts.get(key) ?? 0) > 0)
            .map(([key, cfg]) => (
              <div
                key={key}
                className={`cat-tab ${activeCat === key ? "active" : ""}`}
                onClick={() => setActiveCat(key)}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span className="count">{key === "all" ? withCat.length : (catCounts.get(key) ?? 0)}</span>
              </div>
            ))}
        </div>

        {/* ── Stats Row ── */}
        <div className="stats-row">
          <div className="stats-card"><div className="num">{stats.dueToday}</div><div className="lbl">Bugün</div></div>
          <div className="stats-card"><div className="num">{stats.dueWeek}</div><div className="lbl">Bu Hafta</div></div>
          <div className="stats-card"><div className="num">{stats.dueMonth}</div><div className="lbl">Bu Ay</div></div>
          <div className="stats-card"><div className="num">{stats.backlog}</div><div className="lbl">Backlog</div></div>
          <div className="stats-card"><div className="num">{stats.inProgress}</div><div className="lbl">In Progress</div></div>
        </div>

        {/* ── Kanban Board ── */}
        {view === "board" && (
          <div className="board">
            {COLUMNS.map((col) => {
              const colCards = filtered.filter((c) => c.column_name === col.db);
              return (
                <div className="column" key={col.db}>
                  <div className={`col-header ${col.cls}`}>
                    <span className="col-title">{col.label}</span>
                    <span className="col-count">{colCards.length}</span>
                  </div>
                  <div className="col-cards">
                    {colCards.slice(0, PER_COLUMN_CAP).map((c) => (
                      <div
                        className="card"
                        key={c.id}
                        onClick={() => setSelected(c)}
                        style={highlightId === c.id ? { outline: "2px solid var(--amber-bright)", boxShadow: "0 0 24px var(--amber-glow)" } : undefined}
                      >
                        <div className={`card-priority ${c.priority.toLowerCase()}`} />
                        <div className="card-title">{c.title}</div>
                        <div className="card-meta">
                          <span className={`card-tag ${c.cat}`}>
                            {CAT_CONFIG[c.cat]?.icon} {CAT_CONFIG[c.cat]?.label}
                          </span>
                          {c.due_date && (
                            <span className={`card-due ${dueClass(c.due_date)}`}>📅 {c.due_date.slice(5)}</span>
                          )}
                          {c.assignee !== "ozgur" && (
                            <span className="card-assignee">→ {c.assignee}</span>
                          )}
                        </div>
                        {c.source_pdf && (
                          <div className="card-source">{c.source_pdf} · s.{c.source_page_number}</div>
                        )}
                      </div>
                    ))}
                    {colCards.length > PER_COLUMN_CAP && (
                      <div className="col-more">+ {colCards.length - PER_COLUMN_CAP} kart daha — filtrele 🔍</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Timeline View ── */}
        {view === "timeline" && (
          <div className="timeline">
            {timelineCards.length === 0 ? (
              <div className="notice">Deadline'lı kart yok (filtrelere takılmış olabilir).</div>
            ) : (
              timelineCards.map((c) => (
                <div className="timeline-item" key={c.id} onClick={() => setSelected(c)}>
                  <div className="timeline-date">{c.due_date}</div>
                  <div className="timeline-content">
                    <div className="timeline-title">{c.title}</div>
                    <div className="timeline-sub">
                      {PRIORITY_LABELS[c.priority]} · {c.column_name} · {CAT_CONFIG[c.cat]?.icon} {CAT_CONFIG[c.cat]?.label}
                      {c.assignee !== "ozgur" ? ` · → ${c.assignee}` : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Detail Panel ── */}
      <div className={`detail-panel ${selected ? "open" : ""}`}>
        {selected && (
          <>
            <button className="detail-close" onClick={() => setSelected(null)}>✕</button>
            <h3 className="detail-title">{selected.title}</h3>
            <div className="detail-field">
              <label>Kategori</label>
              <div className="value">
                {CAT_CONFIG[deriveCategory(selected.labels)]?.icon} {CAT_CONFIG[deriveCategory(selected.labels)]?.label}
              </div>
            </div>
            <div className="detail-field"><label>Öncelik</label><div className="value">{PRIORITY_LABELS[selected.priority]}</div></div>
            <div className="detail-field"><label>Atanan</label><div className="value">{selected.assignee}</div></div>
            <div className="detail-field"><label>Bitiş Tarihi</label><div className="value">{selected.due_date ?? "—"}</div></div>
            <div className="detail-field"><label>Durum</label><div className="value">{COLUMNS.find((c) => c.db === selected.column_name)?.label ?? selected.column_name}</div></div>
            {selected.description && (
              <div className="detail-field"><label>Notlar</label><div className="value">{selected.description}</div></div>
            )}
            {selected.source_pdf && (
              <div className="detail-field">
                <label>Kaynak</label>
                <div className="value">📄 {selected.source_pdf} — sayfa {selected.source_page_number}</div>
              </div>
            )}
            {selected.labels.length > 0 && (
              <div className="detail-field">
                <label>Etiketler</label>
                <div className="value" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selected.labels
                    .filter((l) => !["imported", "from-oz-notes"].includes(l))
                    .map((l) => (
                      <span className="card-tag" key={l}>{l}</span>
                    ))}
                </div>
              </div>
            )}
            {canEdit ? (
              <div className="detail-actions">
                {COLUMNS.filter((c) => c.db !== selected.column_name).map((c) => (
                  <button
                    key={c.db}
                    className={`detail-btn ${c.db === "Done" ? "" : "move"}`}
                    disabled={pending}
                    onClick={() => handleMove(selected, c.db)}
                  >
                    {c.db === "Done" ? "✅ Done yap" : `→ ${c.label}`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="detail-field" style={{ marginTop: 20 }}>
                <div className="value" style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  Taşıma için admin girişi gerekli. ZeuX'e de söyleyebilirsin: admin.skilldrunk.com/ai
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Modal ── */}
      {showAdd && canEdit && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            window.location.reload();
          }}
        />
      )}

      {/* ── Sağkol copilot (floating overlay + pantheon avatar seçici) ── */}
      <SagkolPanel userName={userName} userRole={userRole} />
    </div>
  );
}

/* ── Yeni görev modalı (orijinal modal tasarımı) ── */

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("enco");
  const [priority, setPriority] = useState("P2");
  const [assignee, setAssignee] = useState("ozgur");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await addCard({
        title,
        column_name: "Backlog",
        priority,
        assignee,
        due_date: due || null,
        label: cat,
        description: notes || null,
      });
      if (res.ok) onAdded();
      else alert(`Eklenemedi: ${res.error}`);
    });
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg2)", border: "1px solid var(--card-border)",
          borderRadius: 16, padding: 28, width: "100%", maxWidth: 500,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "var(--amber-bright)", marginBottom: 20 }}>
          👑 Yeni Görev
        </h2>
        <ModalField label="Başlık">
          <input className="search-box" style={{ paddingLeft: 16 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ne yapılacak?" autoFocus />
        </ModalField>
        <ModalField label="Kategori">
          <select className="search-box" style={{ paddingLeft: 16 }} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="enco">🚛 ENCO</option>
            <option value="movetech">📦 MoveTech</option>
            <option value="ai">🤖 AI/Tech</option>
            <option value="marketing">📣 Marketing</option>
            <option value="personal">🎮 Kişisel</option>
            <option value="futurecode">💻 FutureCode</option>
            <option value="greenx">🌱 GreenX</option>
            <option value="hukuk">⚖️ Hukuk</option>
          </select>
        </ModalField>
        <ModalField label="Öncelik">
          <select className="search-box" style={{ paddingLeft: 16 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="P0">🔥 P0 — Kritik</option>
            <option value="P1">🔴 P1 — Yüksek</option>
            <option value="P2">🟡 P2 — Orta</option>
            <option value="P3">⚪ P3 — Düşük</option>
          </select>
        </ModalField>
        <ModalField label="Atanan">
          <select className="search-box" style={{ paddingLeft: 16 }} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="ozgur">Özgür</option>
            <option value="claude">ZeuX / Claude</option>
            <option value="team">Team</option>
          </select>
        </ModalField>
        <ModalField label="Bitiş Tarihi">
          <input type="date" className="search-box" style={{ paddingLeft: 16 }} value={due} onChange={(e) => setDue(e.target.value)} />
        </ModalField>
        <ModalField label="Notlar">
          <textarea className="search-box" style={{ paddingLeft: 16, minHeight: 60, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detaylar..." />
        </ModalField>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="filter-btn" style={{ flex: "0 0 auto" }} onClick={onClose}>İptal</button>
          <button
            className="filter-btn active"
            style={{ flex: 1, fontWeight: 700 }}
            disabled={pending || !title.trim()}
            onClick={submit}
          >
            ✨ Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
