import type Anthropic from "@anthropic-ai/sdk";
import type { PendingClientTool, SagkolEvent } from "./types";

export interface SagkolUser {
  key: string;
  name: string;
  role?: string;
}

/** İnline (server) araç sonucu — loop tool_result olarak ekler. */
export interface ServerToolResult {
  result: unknown;
  summary: string;
  isError: boolean;
  /** Opsiyonel ek olaylar (ör. generate_report → report kartı). */
  emit?: SagkolEvent[];
}

/** Client/suspend araç sonucu — loop suspend edip pending'i kaydeder. */
export interface ClientToolResult {
  pending: PendingClientTool;
  emit: SagkolEvent[];
  /** propose_mutation gibi: suspend öncesi kısmi tool_result (yoksa boş). */
  partialResult?: Anthropic.ToolResultBlockParam;
}

/**
 * Domain adapter'ı — her projenin implemente ettiği İNCE sözleşme.
 * Core motoru (loop) tamamen bu arayüze göre çalışır; domain bilgisi burada kalır.
 */
export interface SagkolAdapter<User extends SagkolUser = SagkolUser> {
  readonly model: string;
  readonly maxIterations: number;
  readonly maxToolExecutions: number;
  readonly historyWindow: number;
  readonly tools: Anthropic.Tool[];

  /** system blokları: [Blok A sabit+cache_control, Blok B oturum/rol]. */
  buildSystem(user: User): Anthropic.TextBlockParam[];

  /** Yeni user turn'ünün volatile bağlamı (ekran + audit delta). lastSeenAuditId geri döner. */
  buildTurnContext(args: {
    user: User;
    userMessage?: string;
    screen?: unknown;
  }): Promise<{ text: string; lastSeenAuditId: number }>;

  /** Bir aracın inline mı yoksa suspend (client/onay) mı olduğunu söyler. */
  classifyTool(name: string): "server" | "client";

  executeServerTool(
    name: string,
    input: Record<string, unknown>,
    ctx: { conversationId: string; user: User },
  ): Promise<ServerToolResult>;

  handleClientTool(args: {
    toolUse: Anthropic.ToolUseBlock;
    input: Record<string, unknown>;
    conversationId: string;
    user: User;
  }): Promise<ClientToolResult>;
}
