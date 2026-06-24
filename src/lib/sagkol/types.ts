/**
 * tÖdÜs Sağkol — domain tipleri.
 * Core SSE event'leri @sagkol/core'dan; burada domain'e özel ui_command + proposal şekli.
 */

/** Board'u süren komutlar (CustomEvent köprüsüyle board-view'a iner). */
export interface TodusUiCommand {
  command:
    | "filter"          // priority/assignee/label/column/search filtrele
    | "clear_filter"
    | "highlight_card"  // bir kartı vurgula + scroll
    | "set_view";       // board | timeline
  priority?: string;
  assignee?: string;
  label?: string;
  column?: string;
  search?: string;
  cardId?: string;
  view?: "board" | "timeline";
}

/** Onay-kapılı mutasyon operasyonları (tÖdÜs). */
export type TodusOperation =
  | { op: "move_card"; entity_id: string; fields: { column_name: string }; reason: string }
  | { op: "set_priority"; entity_id: string; fields: { priority: string }; reason: string }
  | { op: "assign_card"; entity_id: string; fields: { assignee: string }; reason: string }
  | { op: "set_due_date"; entity_id: string; fields: { due_date: string | null }; reason: string }
  | { op: "archive_card"; entity_id: string; fields?: Record<string, never>; reason: string }
  | {
      op: "create_card";
      fields: {
        title: string;
        column_name?: string;
        priority?: string;
        assignee?: string;
        due_date?: string | null;
        label?: string;
        description?: string;
      };
      reason: string;
    };

export interface TodusProposalView {
  id: string;
  summaryTr: string;
  operations: TodusOperation[];
  status: string;
}
