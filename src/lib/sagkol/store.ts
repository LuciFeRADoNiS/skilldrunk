import type Anthropic from "@anthropic-ai/sdk";
import type { StorePort, ConversationRow, PendingState, ProposalResult } from "@sagkol/core";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TodusOperation } from "./types";

const APP = "todus";

function db() {
  const c = createAdminClient();
  if (!c) throw new Error("Sağkol: SUPABASE_SERVICE_ROLE_KEY yok");
  return c;
}

/**
 * Supabase implementasyonu — @sagkol/core StorePort sözleşmesi (P0):
 * optimistic lock (version), verbatim mesaj blokları, pending round-trip, recordProposalResult.
 */
export class SupabaseStore implements StorePort {
  async loadOrCreateConversation(
    id: string | undefined,
    userKey: string,
  ): Promise<ConversationRow> {
    const c = db();
    if (id) {
      const { data, error } = await c
        .from("ai_conversations")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          userKey: data.user_key,
          messages: (data.messages as Anthropic.MessageParam[]) ?? [],
          pending: (data.pending as PendingState) ?? null,
          lastSeenAuditId: Number(data.last_seen_audit_id ?? 0),
          version: Number(data.version ?? 0),
        };
      }
    }
    const { data, error } = await c
      .from("ai_conversations")
      .insert({ user_key: userKey, app: APP, messages: [] })
      .select("id")
      .single();
    if (error) throw new Error(`Konuşma oluşturulamadı: ${error.message}`);
    return {
      id: data.id,
      userKey,
      messages: [],
      pending: null,
      lastSeenAuditId: 0,
      version: 0,
    };
  }

  async saveConversation(
    id: string,
    messages: Anthropic.MessageParam[],
    pending: PendingState | null,
    lastSeenAuditId: number,
    expectedVersion: number,
  ): Promise<{ ok: boolean; version: number }> {
    const next = expectedVersion + 1;
    const { data, error } = await db()
      .from("ai_conversations")
      .update({
        messages: messages as unknown as never,
        pending: pending as unknown as never,
        last_seen_audit_id: lastSeenAuditId,
        version: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("version", expectedVersion) // optimistic lock — P0
      .select("id");
    if (error) {
      console.error("[sagkol] konuşma kaydedilemedi:", error.message);
      return { ok: false, version: expectedVersion };
    }
    const won = (data ?? []).length > 0;
    return { ok: won, version: won ? next : expectedVersion };
  }

  async recordProposalResult(
    id: string,
    status: "confirmed" | "partial" | "failed",
    result: ProposalResult,
  ): Promise<void> {
    const { error } = await db()
      .from("ai_proposals")
      .update({
        status,
        result: result as unknown as never,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) console.error("[sagkol] öneri sonucu yazılamadı:", error.message);
  }
}

/* ── Proposal CRUD (StorePort dışı — confirm route + adapter kullanır) ── */

export async function createProposal(opts: {
  conversationId: string;
  toolUseId: string;
  operations: TodusOperation[];
  summaryTr: string;
  createdBy: string;
}): Promise<{ id: string }> {
  const { data, error } = await db()
    .from("ai_proposals")
    .insert({
      conversation_id: opts.conversationId,
      tool_use_id: opts.toolUseId,
      app: APP,
      operations: opts.operations as unknown as never,
      summary_tr: opts.summaryTr,
      created_by: opts.createdBy,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Öneri kaydedilemedi: ${error.message}`);
  return { id: data.id };
}

export interface ProposalRow {
  id: string;
  conversation_id: string | null;
  tool_use_id: string;
  operations: TodusOperation[];
  summary_tr: string | null;
  status: string;
  created_by: string;
  created_at: string;
}

export async function getProposal(id: string): Promise<ProposalRow | null> {
  const { data, error } = await db()
    .from("ai_proposals")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    conversation_id: data.conversation_id,
    tool_use_id: data.tool_use_id,
    operations: (data.operations as TodusOperation[]) ?? [],
    summary_tr: data.summary_tr,
    status: data.status,
    created_by: data.created_by,
    created_at: data.created_at,
  };
}

/** pending → status idempotent geçişi (yarış koruması). */
export async function resolveProposal(
  id: string,
  status: "confirmed" | "rejected" | "expired" | "stale",
  by: string,
): Promise<boolean> {
  const { data, error } = await db()
    .from("ai_proposals")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: by })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) return false;
  return (data ?? []).length > 0;
}

export async function recordProposalResult(
  id: string,
  status: "confirmed" | "partial" | "failed",
  result: ProposalResult,
): Promise<void> {
  await new SupabaseStore().recordProposalResult(id, status, result);
}
