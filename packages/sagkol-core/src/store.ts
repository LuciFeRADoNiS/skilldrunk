import type Anthropic from "@anthropic-ai/sdk";
import type { ConversationRow, PendingState, ProposalResult } from "./types";

/**
 * Kalıcılık portu — DB-bağımsız. Host (Supabase, Prisma, vb.) bunu implemente eder.
 *
 * P0 SÖZLEŞMESİ (pazarlıksız):
 * - saveConversation optimistic-lock yapmalı: yalnızca satırın version'ı expectedVersion'a
 *   eşitse yazmalı. Başarıda version'ı KESİN ARTIRMALI (next = expectedVersion + 1) ve
 *   {ok: true, version: next} dönmeli; çakışmada {ok: false, version: expectedVersion}.
 *   Version asla azalmaz/yeniden kullanılmaz — motor versiyonlamayı tamamen buraya delege eder,
 *   eşitlik kapısını geçip artırmamak kilidi sessizce bozar. Last-write-wins YASAK (mesaj kaybı +
 *   dangling tool_use → API 400).
 * - loadOrCreateConversation insert path'inde version 0 ile başlamalı (DB default 0 ile uyumlu).
 */
export interface StorePort {
  loadOrCreateConversation(id: string | undefined, userKey: string): Promise<ConversationRow>;

  saveConversation(
    id: string,
    messages: Anthropic.MessageParam[],
    pending: PendingState | null,
    lastSeenAuditId: number,
    expectedVersion: number,
  ): Promise<{ ok: boolean; version: number }>;

  /** Apply sonucunu öneriye yazar (izlenebilirlik). status: confirmed|partial|failed. */
  recordProposalResult?(
    id: string,
    status: "confirmed" | "partial" | "failed",
    result: ProposalResult,
  ): Promise<void>;
}
