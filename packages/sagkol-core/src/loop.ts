import Anthropic from "@anthropic-ai/sdk";
import type { SagkolAdapter, SagkolUser } from "./adapter";
import type { StorePort } from "./store";
import type { ConversationRow, PendingClientTool, PendingState, SagkolEvent } from "./types";

export type Emit = (ev: SagkolEvent) => void;

export interface RunOpts<User extends SagkolUser> {
  user: User;
  conversation: ConversationRow;
  emit: Emit;
  signal: AbortSignal;
  /** Yeni user turn (resume'da undefined). */
  userMessage?: string;
  screen?: unknown;
  /** Client tool sonuçları (resume). */
  clientToolResults?: { toolUseId: string; ok: boolean; result: unknown }[];
}

function toolResultBlock(toolUseId: string, content: unknown, isError = false): Anthropic.ToolResultBlockParam {
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    content: typeof content === "string" ? content : JSON.stringify(content),
    ...(isError ? { is_error: true } : {}),
  };
}

/**
 * Sağkol çekirdek motoru — domain-bağımsız manuel agentic loop.
 * Onay kapısı için suspend/resume; P0 optimistic-lock persist; history penceresi; dup koruması.
 * Tüm domain bilgisi `adapter` üzerinden gelir; kalıcılık `store` portundan.
 */
export async function runAgentLoop<User extends SagkolUser>(
  adapter: SagkolAdapter<User>,
  store: StorePort,
  anthropic: Anthropic,
  opts: RunOpts<User>,
): Promise<void> {
  const { user, conversation, emit, signal } = opts;
  const messages: Anthropic.MessageParam[] = [...conversation.messages];
  const seenCalls = new Set<string>();
  let toolExecutions = 0;

  // P0: optimistic-lock korumalı kayıt. İlerleme save'lerinde çakışmada uyarıp durur; terminal'de sessiz.
  async function persist(pending: PendingState | null, o?: { terminal?: boolean }): Promise<boolean> {
    const res = await store.saveConversation(
      conversation.id,
      messages,
      pending,
      conversation.lastSeenAuditId,
      conversation.version,
    );
    if (res.ok) {
      conversation.version = res.version;
      return true;
    }
    if (!o?.terminal) {
      emit({ type: "error", message: "Bu konuşma başka bir sekmede güncellendi. Sayfayı yenile." });
      emit({ type: "done", reason: "error" });
    }
    return false;
  }

  // ── Girdi mesajını kur (resume backfill + yeni turn) ──
  const pending = conversation.pending;
  const userContent: (Anthropic.ToolResultBlockParam | Anthropic.TextBlockParam)[] = [];

  if (pending) {
    userContent.push(...(pending.partialResults ?? []));
    const provided = new Map((opts.clientToolResults ?? []).map((r) => [r.toolUseId, r]));
    for (const pt of pending.pendingToolUses) {
      const res = provided.get(pt.toolUseId);
      if (res) {
        userContent.push(toolResultBlock(pt.toolUseId, res.result, !res.ok));
      } else {
        userContent.push(
          toolResultBlock(pt.toolUseId, { cancelled: true, reason: "kullanıcı beklemeden devam etti" }, true),
        );
      }
    }
  }

  if (opts.userMessage !== undefined) {
    const { text, lastSeenAuditId } = await adapter.buildTurnContext({
      user,
      userMessage: opts.userMessage,
      screen: opts.screen,
    });
    conversation.lastSeenAuditId = lastSeenAuditId;
    userContent.push({ type: "text", text });
  }

  if (userContent.length === 0) {
    emit({ type: "error", message: "İşlenecek girdi yok." });
    emit({ type: "done", reason: "error" });
    return;
  }
  messages.push({ role: "user", content: userContent });

  // ── History penceresi — kırpmayı düz-metin user turn'üne çek (P0 tuzak: 400) ──
  const windowed =
    messages.length > adapter.historyWindow ? messages.slice(messages.length - adapter.historyWindow) : messages;
  let startIdx = 0;
  for (let i = 0; i < windowed.length; i++) {
    const m = windowed[i];
    const isPlainUser =
      m.role === "user" &&
      (typeof m.content === "string" || (Array.isArray(m.content) && m.content.every((b) => b.type === "text")));
    if (isPlainUser) {
      startIdx = i;
      break;
    }
  }
  const w2 = windowed.slice(startIdx);
  const sendMessages = w2.length > 0 ? w2 : messages.slice(-2);

  // ── Agentic loop ──
  for (let iteration = 1; iteration <= adapter.maxIterations; iteration++) {
    if (signal.aborted) {
      emit({ type: "done", reason: "aborted" });
      await persist(null, { terminal: true });
      return;
    }

    const stream = anthropic.messages.stream(
      {
        model: adapter.model,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: adapter.buildSystem(user),
        tools: adapter.tools,
        messages: sendMessages,
      },
      { signal },
    );

    let thinkingActive = false;
    stream.on("streamEvent", (ev) => {
      if (ev.type === "content_block_start") {
        if (ev.content_block.type === "thinking" && !thinkingActive) {
          thinkingActive = true;
          emit({ type: "thinking", active: true });
        }
        if (ev.content_block.type === "tool_use") {
          emit({ type: "tool_start", toolUseId: ev.content_block.id, name: ev.content_block.name });
        }
      } else if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        if (thinkingActive) {
          thinkingActive = false;
          emit({ type: "thinking", active: false });
        }
        emit({ type: "text_delta", text: ev.delta.text });
      }
    });

    let final: Anthropic.Message;
    try {
      final = await stream.finalMessage();
    } catch (e) {
      if (signal.aborted) {
        emit({ type: "done", reason: "aborted" });
      } else {
        emit({ type: "error", message: e instanceof Error ? e.message : "API hatası" });
        emit({ type: "done", reason: "error" });
      }
      await persist(null, { terminal: true });
      return;
    }

    if (thinkingActive) emit({ type: "thinking", active: false });
    emit({
      type: "usage",
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
      cacheReadTokens: final.usage.cache_read_input_tokens ?? 0,
      iteration,
    });

    messages.push({ role: "assistant", content: final.content });
    sendMessages.push({ role: "assistant", content: final.content });

    if (final.stop_reason !== "tool_use") {
      if (!(await persist(null))) return;
      emit({ type: "done", reason: "end_turn" });
      return;
    }

    const toolUses = final.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const results: Anthropic.ToolResultBlockParam[] = [];
    const pendingClient: PendingClientTool[] = [];

    for (const tu of toolUses) {
      toolExecutions++;
      if (toolExecutions > adapter.maxToolExecutions) {
        results.push(toolResultBlock(tu.id, { error: "Araç çağrı limiti aşıldı — özetleyip bitir." }, true));
        continue;
      }
      const dupKey = tu.name + JSON.stringify(tu.input);
      if (seenCalls.has(dupKey)) {
        results.push(toolResultBlock(tu.id, { error: "Aynı çağrı az önce yapıldı — sonucu tekrar kullan." }, true));
        continue;
      }
      seenCalls.add(dupKey);
      const input = (tu.input ?? {}) as Record<string, unknown>;

      if (adapter.classifyTool(tu.name) === "client") {
        const r = await adapter.handleClientTool({ toolUse: tu, input, conversationId: conversation.id, user });
        for (const ev of r.emit) emit(ev);
        pendingClient.push(r.pending);
        if (r.partialResult) results.push(r.partialResult);
        continue;
      }

      const sr = await adapter.executeServerTool(tu.name, input, { conversationId: conversation.id, user });
      if (sr.emit) for (const ev of sr.emit) emit(ev);
      emit({ type: "tool_done", toolUseId: tu.id, name: tu.name, summary: sr.summary, isError: sr.isError });
      results.push(toolResultBlock(tu.id, sr.result, sr.isError));
    }

    if (pendingClient.length > 0) {
      if (!(await persist({ pendingToolUses: pendingClient, partialResults: results }))) return;
      emit({
        type: "done",
        reason: pendingClient.some((p) => p.kind === "proposal") ? "awaiting_confirmation" : "awaiting_client_tools",
      });
      return;
    }

    messages.push({ role: "user", content: results });
    sendMessages.push({ role: "user", content: results });
    if (!(await persist(null))) return;
  }

  await persist(null, { terminal: true });
  emit({ type: "done", reason: "max_iterations" });
}
