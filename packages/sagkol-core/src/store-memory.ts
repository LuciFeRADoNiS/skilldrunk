import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { StorePort } from "./store";
import type { ConversationRow, PendingState, ProposalResult } from "./types";

/**
 * In-memory StorePort — DB-bağımsızlığın KANITI ve referans implementasyonu.
 *
 * Supabase/Postgres ile birebir AYNI `StorePort` sözleşmesini hiçbir veritabanı olmadan
 * karşılar; motor (`runAgentLoop`) farkı göremez. "Başka store = yalnız yeni bir StorePort;
 * loop/adapter dokunulmaz" iddiasının çalışan örneğidir. Kullanım:
 *   - Sözleşme testleri (`store-memory.test.ts`) — P0 değişmezlerini (optimistic-lock,
 *     monotonik version, verbatim round-trip) kilitler.
 *   - Hızlı prototip / demo / örnek adapter (DB kurmadan Sağkol denemek).
 *
 * Kalıcı DEĞİLDİR (süreç belleğinde tutar). Üretim için Supabase/Prisma/KV impl'i kullanın.
 *
 * P0 sözleşmesi (bkz. `store.ts`): saveConversation optimistic-lock yapar; başarıda version'ı
 * KESİN artırır (expectedVersion + 1); çakışmada yazmaz ve mevcut version'ı döner.
 */
export class InMemoryStore implements StorePort {
  private conversations = new Map<string, ConversationRow>();
  private proposalResults = new Map<
    string,
    { status: "confirmed" | "partial" | "failed"; result: ProposalResult }
  >();

  async loadOrCreateConversation(
    id: string | undefined,
    userKey: string,
  ): Promise<ConversationRow> {
    if (id) {
      const existing = this.conversations.get(id);
      if (existing) return clone(existing);
    }
    const row: ConversationRow = {
      id: id ?? randomUUID(),
      userKey,
      messages: [],
      pending: null,
      lastSeenAuditId: 0,
      version: 0, // insert path: version 0 (DB default 0 ile uyumlu)
    };
    this.conversations.set(row.id, clone(row));
    return clone(row);
  }

  async saveConversation(
    id: string,
    messages: Anthropic.MessageParam[],
    pending: PendingState | null,
    lastSeenAuditId: number,
    expectedVersion: number,
  ): Promise<{ ok: boolean; version: number }> {
    const row = this.conversations.get(id);
    // Optimistic lock: yalnız mevcut version expectedVersion'a eşitse yaz.
    if (!row || row.version !== expectedVersion) {
      return { ok: false, version: row ? row.version : expectedVersion };
    }
    const next = expectedVersion + 1; // başarıda version KESİN artar (monotonik) — asla azalmaz/yeniden kullanılmaz
    this.conversations.set(id, {
      ...row,
      messages: clone(messages),
      pending: pending ? clone(pending) : null,
      lastSeenAuditId,
      version: next,
    });
    return { ok: true, version: next };
  }

  async recordProposalResult(
    id: string,
    status: "confirmed" | "partial" | "failed",
    result: ProposalResult,
  ): Promise<void> {
    this.proposalResults.set(id, { status, result: clone(result) });
  }

  /** Test/diagnostik yardımcısı — `StorePort` sözleşmesinin parçası DEĞİL. */
  _getProposalResult(id: string) {
    return this.proposalResults.get(id);
  }
}

/** Verbatim round-trip + izolasyon: store hep KOPYA verir/saklar (DB sınırını modeller). */
function clone<T>(v: T): T {
  return structuredClone(v);
}
