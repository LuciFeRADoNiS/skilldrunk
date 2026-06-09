"use client";

// ChatPanel — Domain Custodian chat UI (Faz 2 PR-F).
//
// Portable: depends only on fetch + the two endpoint paths (props-overridable),
// so Cowork can drop it into agents.skilldrunk.com (lestat-inc-agents) with a
// different chatEndpoint/actionEndpoint + injected state.json context.
//
// Approval flow: assistant message may carry pendingActions[] → rendered as
// Onayla/Reddet cards. Onayla → POST actionEndpoint → result appended.
// onaysız execute YOK.

import { useState, useRef, useEffect } from "react";

export interface PendingAction {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

interface Budget {
  spent_usd: number;
  cap_usd: number;
  remaining_usd: number;
  exceeded: boolean;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  pendingActions?: PendingAction[];
  actionResults?: Array<{ tool: string; ok: boolean; detail: string }>;
}

export interface ChatPanelProps {
  chatEndpoint?: string; // default /api/custodian/chat
  actionEndpoint?: string; // default /api/custodian/action
  title?: string;
  accent?: string; // CSS color; default orange
}

const TOOL_LABEL: Record<string, string> = {
  backlog_add: "Backlog'a ekle",
  content_update: "İçerik güncelle",
  trigger_redeploy: "Yeniden deploy",
  revalidate_path: "Cache temizle",
};

export function ChatPanel({
  chatEndpoint = "/api/custodian/chat",
  actionEndpoint = "/api/custodian/action",
  title = "Domain Custodian",
  accent = "#f97316",
}: ChatPanelProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>(
    `cst-${Math.floor(Date.now() / 1000)}-${Math.floor(performance.now())}`,
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setError(null);
    setBusy(true);
    const nextTurns: ChatTurn[] = [...turns, { role: "user", content: q }];
    setTurns(nextTurns);
    setInput("");

    try {
      const apiMessages = nextTurns.map((t) => ({ role: t.role, content: t.content }));
      const res = await fetch(chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, session_id: sessionId.current }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "hata");
        setBusy(false);
        return;
      }
      setBudget(data.budget ?? null);
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: data.answer ?? "",
          pendingActions: data.pendingActions ?? [],
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function approve(turnIdx: number, action: PendingAction) {
    setError(null);
    try {
      const res = await fetch(actionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: action.tool, args: action.args, session_id: sessionId.current }),
      });
      const data = await res.json();
      setTurns((prev) =>
        prev.map((t, i) => {
          if (i !== turnIdx) return t;
          return {
            ...t,
            pendingActions: (t.pendingActions ?? []).filter((a) => a !== action),
            actionResults: [
              ...(t.actionResults ?? []),
              {
                tool: action.tool,
                ok: !!data.ok,
                detail: data.ok ? JSON.stringify(data.result).slice(0, 160) : (data.error ?? "hata"),
              },
            ],
          };
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function reject(turnIdx: number, action: PendingAction) {
    setTurns((prev) =>
      prev.map((t, i) =>
        i !== turnIdx
          ? t
          : {
              ...t,
              pendingActions: (t.pendingActions ?? []).filter((a) => a !== action),
              actionResults: [
                ...(t.actionResults ?? []),
                { tool: action.tool, ok: false, detail: "reddedildi" },
              ],
            },
      ),
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">{title}</h1>
        {budget && (
          <span
            className={`text-[11px] font-mono rounded-full px-2.5 py-1 ${
              budget.exceeded ? "bg-red-500/15 text-red-400" : "bg-neutral-800 text-neutral-400"
            }`}
            title="Günlük custodian bütçesi"
          >
            ${budget.spent_usd} / ${budget.cap_usd}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
      >
        {turns.length === 0 && (
          <p className="text-sm text-neutral-500 text-center mt-8">
            skilldrunk.com hakkında soru sor: &quot;son deploy'lar&quot;, &quot;dün kaç ziyaretçi&quot;,
            &quot;son commit'ler&quot;. Aksiyon istersen önerip onayını bekler.
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap text-left ${
                t.role === "user"
                  ? "bg-neutral-800 text-neutral-100"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-200"
              }`}
            >
              {t.content}
            </div>

            {t.pendingActions && t.pendingActions.length > 0 && (
              <div className="mt-2 space-y-2">
                {t.pendingActions.map((a, j) => (
                  <div
                    key={j}
                    className="rounded-xl border border-amber-700/40 bg-amber-500/5 p-3 text-left"
                  >
                    <p className="text-xs text-amber-300 font-medium mb-1">
                      ⚡ Aksiyon önerisi: {TOOL_LABEL[a.tool] ?? a.tool}
                    </p>
                    <pre className="text-[11px] text-neutral-400 font-mono overflow-x-auto mb-2">
                      {JSON.stringify(a.args, null, 2)}
                    </pre>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(i, a)}
                        className="rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{ background: accent }}
                      >
                        Onayla
                      </button>
                      <button
                        onClick={() => reject(i, a)}
                        className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {t.actionResults && t.actionResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {t.actionResults.map((r, j) => (
                  <p
                    key={j}
                    className={`text-[11px] font-mono ${r.ok ? "text-emerald-400" : "text-neutral-500"}`}
                  >
                    {r.ok ? "✓" : "✗"} {TOOL_LABEL[r.tool] ?? r.tool}: {r.detail}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-xs text-neutral-500">düşünüyor…</p>}
      </div>

      {error && <p className="mt-2 text-xs text-red-400">⚠️ {error}</p>}

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="skilldrunk.com'a sor…"
          disabled={busy}
          className="flex-1 rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none focus:border-neutral-600"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: accent }}
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
