import type Anthropic from "@anthropic-ai/sdk";
import type {
  SagkolAdapter,
  SagkolUser,
  ServerToolResult,
  ClientToolResult,
} from "@sagkol/core";
import { TODUS_TOOLS, executeTodusServerTool } from "./tools";
import { buildSystem, buildTurnContext } from "./system-prompt";
import { canPropose } from "./permissions";
import { createProposal } from "./store";
import type { TodusOperation, TodusUiCommand } from "./types";

const CLIENT_TOOLS = new Set(["ui_command", "propose_mutation"]);

/**
 * tÖdÜs domain adapter'ı — @sagkol/core motorunun çalıştığı ince sözleşme.
 * Motor (runAgentLoop) tamamen bu arayüze göre çalışır; domain bilgisi burada.
 */
export class TodusAdapter implements SagkolAdapter {
  readonly model = "claude-opus-4-8";
  readonly maxIterations = 8;
  readonly maxToolExecutions = 24;
  readonly historyWindow = 40;
  readonly tools: Anthropic.Tool[] = TODUS_TOOLS;

  buildSystem(user: SagkolUser): Anthropic.TextBlockParam[] {
    return buildSystem(user);
  }

  buildTurnContext(args: {
    user: SagkolUser;
    userMessage?: string;
    screen?: unknown;
  }): Promise<{ text: string; lastSeenAuditId: number }> {
    return buildTurnContext(args);
  }

  classifyTool(name: string): "server" | "client" {
    return CLIENT_TOOLS.has(name) ? "client" : "server";
  }

  executeServerTool(
    name: string,
    input: Record<string, unknown>,
    ctx: { conversationId: string; user: SagkolUser },
  ): Promise<ServerToolResult> {
    return executeTodusServerTool(name, input, ctx.user);
  }

  async handleClientTool(args: {
    toolUse: Anthropic.ToolUseBlock;
    input: Record<string, unknown>;
    conversationId: string;
    user: SagkolUser;
  }): Promise<ClientToolResult> {
    const { toolUse, input, conversationId, user } = args;

    // ── ui_command: board'u sür (client uygular, sonucu geri döner) ──
    if (toolUse.name === "ui_command") {
      const cmd = input as unknown as TodusUiCommand;
      return {
        pending: { toolUseId: toolUse.id, kind: "ui_command" },
        emit: [{ type: "ui_command", toolUseId: toolUse.id, command: cmd }],
      };
    }

    // ── propose_mutation: yetki kontrolü → öneri satırı → onay kartı (SUSPEND) ──
    if (toolUse.name === "propose_mutation") {
      const perm = canPropose(user);
      if (!perm.ok) {
        // Layer 2 reddi — is_error tool_result, suspend YOK (server gibi davran)
        return {
          pending: { toolUseId: toolUse.id, kind: "rejected" },
          emit: [
            {
              type: "tool_done",
              toolUseId: toolUse.id,
              name: "propose_mutation",
              summary: "Yetki reddi (read-only)",
              isError: true,
            },
          ],
          partialResult: {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({ rejected: true, reason: perm.reason }),
            is_error: true,
          },
        };
      }

      const operations = (input.operations as TodusOperation[]) ?? [];
      const summaryTr = (input.summary_tr as string) ?? "Kart değişikliği önerisi";
      const { id: proposalId } = await createProposal({
        conversationId,
        toolUseId: toolUse.id,
        operations,
        summaryTr,
        createdBy: user.key,
      });

      return {
        pending: { toolUseId: toolUse.id, kind: "proposal", proposalId },
        emit: [
          {
            type: "mutation_proposal",
            toolUseId: toolUse.id,
            proposal: { id: proposalId, summaryTr, operations, status: "pending" },
          },
        ],
        // partialResult YOK — confirm sonrası clientToolResults ile gelir
      };
    }

    // bilinmeyen client tool
    return {
      pending: { toolUseId: toolUse.id, kind: "unknown" },
      emit: [],
      partialResult: {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify({ error: `Bilinmeyen client tool: ${toolUse.name}` }),
        is_error: true,
      },
    };
  }
}
