"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TodusProposalView, TodusUiCommand } from "@/lib/sagkol/types";

/** Core SSE event'leri (passthrough domain üyeleriyle). */
type SagkolEvent =
  | { type: "start"; conversationId: string }
  | { type: "thinking"; active: boolean }
  | { type: "text_delta"; text: string }
  | { type: "tool_start"; toolUseId: string; name: string }
  | { type: "tool_done"; toolUseId: string; name: string; summary: string; isError?: boolean }
  | { type: "ui_command"; toolUseId: string; command: TodusUiCommand }
  | { type: "mutation_proposal"; toolUseId: string; proposal: TodusProposalView }
  | { type: "usage"; inputTokens: number; outputTokens: number; cacheReadTokens: number; iteration: number }
  | { type: "done"; reason: string }
  | { type: "error"; message: string };

export type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; toolUseId: string; name: string; summary?: string; isError?: boolean; done: boolean }
  | { kind: "proposal"; toolUseId: string; proposal: TodusProposalView; resolved?: "confirmed" | "rejected"; resultNote?: string }
  | { kind: "error"; message: string };

interface ClientToolResult {
  toolUseId: string;
  ok: boolean;
  result: unknown;
}

/** ui_command'ı board'a CustomEvent ile uygular. board-view dinler. */
function executeUiCommand(cmd: TodusUiCommand): unknown {
  if (typeof window === "undefined") return { ok: false };
  window.dispatchEvent(new CustomEvent("sagkol:todus", { detail: cmd }));
  return { ok: true, applied: cmd.command };
}

export function useSagkolChat() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const streamRequest = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    const pendingClientResults: ClientToolResult[] = [];
    let suspendReason: string | null = null;

    // Ekran durumunu board'dan oku (filtre/görünüm)
    let screen: unknown = { view: "board" };
    if (typeof window !== "undefined") {
      screen = (window as unknown as { __todusScreen?: unknown }).__todusScreen ?? { view: "board" };
    }

    try {
      const res = await fetch("/api/sagkol/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, conversationId: conversationIdRef.current, screen }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        setItems((it) => [...it, { kind: "error", message: `Sunucu hatası (${res.status})` }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handle = (ev: SagkolEvent) => {
        switch (ev.type) {
          case "start":
            conversationIdRef.current = ev.conversationId;
            break;
          case "thinking":
            setThinking(ev.active);
            break;
          case "usage":
            if (ev.cacheReadTokens > 0) setCacheHit(true);
            break;
          case "text_delta":
            setItems((it) => {
              const last = it[it.length - 1];
              if (last?.kind === "assistant") {
                return [...it.slice(0, -1), { kind: "assistant", text: last.text + ev.text }];
              }
              return [...it, { kind: "assistant", text: ev.text }];
            });
            break;
          case "tool_start":
            setItems((it) => [...it, { kind: "tool", toolUseId: ev.toolUseId, name: ev.name, done: false }]);
            break;
          case "tool_done":
            setItems((it) =>
              it.map((x) =>
                x.kind === "tool" && x.toolUseId === ev.toolUseId
                  ? { ...x, done: true, summary: ev.summary, isError: ev.isError }
                  : x,
              ),
            );
            break;
          case "ui_command": {
            const result = executeUiCommand(ev.command);
            pendingClientResults.push({ toolUseId: ev.toolUseId, ok: true, result });
            setItems((it) =>
              it.map((x) =>
                x.kind === "tool" && x.toolUseId === ev.toolUseId
                  ? { ...x, done: true, summary: "board güncellendi" }
                  : x,
              ),
            );
            break;
          }
          case "mutation_proposal":
            setItems((it) => [
              ...it.filter((x) => !(x.kind === "tool" && x.toolUseId === ev.toolUseId)),
              { kind: "proposal", toolUseId: ev.toolUseId, proposal: ev.proposal },
            ]);
            break;
          case "error":
            setItems((it) => [...it, { kind: "error", message: ev.message }]);
            break;
          case "done":
            suspendReason = ev.reason;
            break;
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            handle(JSON.parse(dataLine.slice(6)) as SagkolEvent);
          } catch {
            /* bozuk parça atla */
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setItems((it) => [...it, { kind: "error", message: "Bağlantı hatası" }]);
      }
    } finally {
      setThinking(false);
      setBusy(false);
      abortRef.current = null;
    }

    // ui_command'lar otomatik resume edilir (onay beklemeyenler)
    if (suspendReason === "awaiting_client_tools" && pendingClientResults.length > 0) {
      await streamRequest({ clientToolResults: pendingClientResults });
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      setItems((it) => [...it, { kind: "user", text }]);
      await streamRequest({ userMessage: text });
    },
    [streamRequest],
  );

  const resolveProposal = useCallback(
    async (item: Extract<ChatItem, { kind: "proposal" }>, decision: "confirm" | "reject") => {
      setBusy(true);
      try {
        const res = await fetch("/api/sagkol/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposalId: item.proposal.id, decision }),
        });
        const data = (await res.json()) as { toolResult?: Record<string, unknown>; error?: string };
        const toolResult = data.toolResult ?? { approved: false, reason: data.error ?? "hata" };
        const approved = toolResult.approved === true;

        setItems((it) =>
          it.map((x) =>
            x.kind === "proposal" && x.proposal.id === item.proposal.id
              ? {
                  ...x,
                  resolved: approved ? "confirmed" : "rejected",
                  resultNote: approved
                    ? `Uygulandı (${(toolResult.applied as string[])?.length ?? 0} işlem)`
                    : String(toolResult.reason ?? "Reddedildi"),
                }
              : x,
          ),
        );
        await streamRequest({
          clientToolResults: [{ toolUseId: item.toolUseId, ok: approved, result: toolResult }],
        });
        if (approved) router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [streamRequest, router],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => {
    conversationIdRef.current = undefined;
    setItems([]);
  }, []);

  return { items, busy, thinking, cacheHit, send, resolveProposal, stop, reset };
}
