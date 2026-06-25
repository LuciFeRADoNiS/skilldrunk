import type Anthropic from "@anthropic-ai/sdk";

/** Loop'un terminal sebepleri. */
export type DoneReason =
  | "end_turn"
  | "awaiting_client_tools"
  | "awaiting_confirmation"
  | "max_iterations"
  | "aborted"
  | "error";

/**
 * Çekirdek SSE olayları + adapter'a açık passthrough üye.
 * Domain'e özel olaylar (ui_command, mutation_proposal, report) son üyeyle taşınır.
 */
export type SagkolEvent =
  | { type: "thinking"; active: boolean }
  | { type: "text_delta"; text: string }
  | { type: "tool_start"; toolUseId: string; name: string }
  | { type: "tool_done"; toolUseId: string; name: string; summary: string; isError?: boolean }
  | { type: "usage"; inputTokens: number; outputTokens: number; cacheReadTokens: number; iteration: number }
  | { type: "done"; reason: DoneReason }
  | { type: "error"; message: string }
  | { type: string; [key: string]: unknown };

/** Suspend edilen (client'ın çalıştıracağı / kullanıcının onaylayacağı) araç. */
export interface PendingClientTool {
  toolUseId: string;
  kind: string; // "ui_command" | "proposal" | adapter'a özel
  [key: string]: unknown;
}

/** Suspend anında DB'ye yazılan durum (resume backfill için). */
export interface PendingState {
  pendingToolUses: PendingClientTool[];
  partialResults: Anthropic.ToolResultBlockParam[];
}

/** Konuşma satırı — version optimistic-lock için ZORUNLU (P0). */
export interface ConversationRow {
  id: string;
  userKey: string;
  messages: Anthropic.MessageParam[];
  pending: PendingState | null;
  lastSeenAuditId: number;
  version: number;
}

/** applyProposal sözleşmesinin dönüşü. */
export interface ProposalResult {
  applied: string[];
  errors: string[];
}
