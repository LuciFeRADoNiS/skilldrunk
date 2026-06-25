import { createAdminClient } from "@/lib/supabase/admin";
import type { ProposalResult } from "@sagkol/core";
import type { TodusOperation } from "./types";

const VALID_COLUMNS = ["Backlog", "Todo", "In Progress", "Review", "Done"];
const VALID_PRIORITY = ["P0", "P1", "P2", "P3"];

function db() {
  const c = createAdminClient();
  if (!c) throw new Error("Sağkol: SUPABASE_SERVICE_ROLE_KEY yok");
  return c;
}

/**
 * Atomik apply (P0): ÖNCE tüm op'ları doğrula — kart var mı, alanlar geçerli mi.
 * Biri kötüyse TEK YAZIM yapmadan {applied:[], errors} döner (kısmi yazım YOK).
 * actor = 'ai' → kanban_activity trigger'ı otomatik loglar.
 */
export async function applyTodusProposal(
  operations: TodusOperation[],
): Promise<ProposalResult> {
  const c = db();
  const errors: string[] = [];

  // ── 1) Ön-doğrulama (sıfır yazım) ──
  // create_card dışı tüm op'lar mevcut bir kart id'si ister → hepsini tek sorguda doğrula
  const idsNeeded = operations
    .filter((o): o is Exclude<TodusOperation, { op: "create_card" }> => o.op !== "create_card")
    .map((o) => o.entity_id);

  const existing = new Set<string>();
  if (idsNeeded.length > 0) {
    const { data, error } = await c
      .from("kanban_cards")
      .select("id")
      .in("id", idsNeeded);
    if (error) return { applied: [], errors: [`Kart doğrulaması başarısız: ${error.message}`] };
    for (const r of data ?? []) existing.add(r.id);
  }

  for (const op of operations) {
    switch (op.op) {
      case "create_card":
        if (!op.fields.title?.trim()) errors.push("create_card: başlık boş");
        if (op.fields.column_name && !VALID_COLUMNS.includes(op.fields.column_name))
          errors.push(`create_card: geçersiz kolon "${op.fields.column_name}"`);
        if (op.fields.priority && !VALID_PRIORITY.includes(op.fields.priority))
          errors.push(`create_card: geçersiz öncelik "${op.fields.priority}"`);
        break;
      case "move_card":
        if (!existing.has(op.entity_id)) errors.push(`move_card: kart bulunamadı (${op.entity_id})`);
        if (!VALID_COLUMNS.includes(op.fields.column_name))
          errors.push(`move_card: geçersiz kolon "${op.fields.column_name}"`);
        break;
      case "set_priority":
        if (!existing.has(op.entity_id)) errors.push(`set_priority: kart bulunamadı (${op.entity_id})`);
        if (!VALID_PRIORITY.includes(op.fields.priority))
          errors.push(`set_priority: geçersiz öncelik "${op.fields.priority}"`);
        break;
      case "assign_card":
        if (!existing.has(op.entity_id)) errors.push(`assign_card: kart bulunamadı (${op.entity_id})`);
        if (!op.fields.assignee?.trim()) errors.push("assign_card: atanan boş");
        break;
      case "set_due_date":
        if (!existing.has(op.entity_id)) errors.push(`set_due_date: kart bulunamadı (${op.entity_id})`);
        if (op.fields.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(op.fields.due_date))
          errors.push(`set_due_date: tarih YYYY-MM-DD olmalı (${op.fields.due_date})`);
        break;
      case "archive_card":
        if (!existing.has(op.entity_id)) errors.push(`archive_card: kart bulunamadı (${op.entity_id})`);
        break;
    }
  }

  if (errors.length > 0) return { applied: [], errors }; // P0: kötüyse sıfır yazım

  // ── 2) Uygula ──
  const applied: string[] = [];
  const runtimeErrors: string[] = [];

  for (const op of operations) {
    try {
      if (op.op === "create_card") {
        const { data: board } = await c
          .from("kanban_boards")
          .select("id")
          .eq("slug", "todus-ozgur-personal")
          .single();
        const labels = ["sagkol-created"];
        if (op.fields.label) labels.push(op.fields.label);
        const { error } = await c.from("kanban_cards").insert({
          board_id: board?.id,
          title: op.fields.title.slice(0, 200),
          description: op.fields.description ?? null,
          column_name: op.fields.column_name ?? "Backlog",
          priority: op.fields.priority ?? "P2",
          assignee: op.fields.assignee ?? "ozgur",
          due_date: op.fields.due_date ?? null,
          labels,
          created_by: "sagkol-ai",
        });
        if (error) throw new Error(error.message);
        applied.push(`Yeni kart: "${op.fields.title}"`);
      } else {
        const patch: Record<string, unknown> = {};
        if (op.op === "move_card") patch.column_name = op.fields.column_name;
        if (op.op === "set_priority") patch.priority = op.fields.priority;
        if (op.op === "assign_card") patch.assignee = op.fields.assignee;
        if (op.op === "set_due_date") patch.due_date = op.fields.due_date;
        if (op.op === "archive_card") patch.is_archived = true;
        const { error } = await c
          .from("kanban_cards")
          .update(patch)
          .eq("id", op.entity_id);
        if (error) throw new Error(error.message);
        applied.push(`${op.op} (${op.entity_id.slice(0, 8)})`);
      }
    } catch (e) {
      runtimeErrors.push(`${op.op}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { applied, errors: runtimeErrors };
}
