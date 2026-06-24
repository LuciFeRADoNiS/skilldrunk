import type Anthropic from "@anthropic-ai/sdk";
import type { ServerToolResult, SagkolUser } from "@sagkol/core";
import { createAdminClient } from "@/lib/supabase/admin";

function db() {
  const c = createAdminClient();
  if (!c) throw new Error("Sağkol: SUPABASE_SERVICE_ROLE_KEY yok");
  return c;
}

/* ── Donmuş araç şemaları ("ne zaman çağır" dili — Opus 4.8 custom tool'lara temkinli) ── */

export const TODUS_TOOLS: Anthropic.Tool[] = [
  {
    name: "query_kanban_cards",
    description:
      "tÖdÜs kanban kartlarını sorgular (579 kart, Özgür'ün el yazısı notlarından üretildi). Kullanıcı 'şu işler', 'Erdinç'in kartları', 'bu haftaki P0'lar', 'karbon geçen kartlar' gibi bir şey sorduğunda MUTLAKA bunu çağır — ezberden sayı uydurma.",
    input_schema: {
      type: "object",
      properties: {
        search_term: { type: "string", description: "Başlık/açıklama içinde arama" },
        column_name: { type: "string", enum: ["Backlog", "Todo", "In Progress", "Review", "Done"] },
        priority: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
        assignee: { type: "string", description: "ozgur, Erdinç, Sefa, Cihad, Eyüp, claude vb." },
        label: { type: "string" },
        due_within_days: { type: "integer", description: "Bugünden N gün içinde deadline'lı" },
        limit: { type: "integer", default: 25 },
      },
      required: [],
    },
  },
  {
    name: "query_oz_notes",
    description:
      "Özgür'ün el yazısı PDF notlarından (oznotes1-8.pdf, 30 parsed sayfa) parse edilmiş içeriği sorgular. Kullanıcı 'şu kişi geçen notlar', 'Movetech notları', 'şu sayfada ne vardı' gibi bir şey sorarsa MUTLAKA bunu çağır. NOT: transkripsiyonlar el yazısından okundu, belirsizlik olabilir.",
    input_schema: {
      type: "object",
      properties: {
        search_term: { type: "string" },
        person: { type: "string" },
        organization: { type: "string" },
        source_pdf: { type: "string", description: "oznotes1.pdf vb." },
        limit: { type: "integer", default: 8 },
      },
      required: [],
    },
  },
  {
    name: "get_board_stats",
    description:
      "Board'un özet istatistiklerini döndürür (kolona/önceliğe/atanana göre kart sayıları, deadline dağılımı). Kullanıcı 'durum ne', 'kaç P0 var', 'kim ne kadar yüklü' diye sorarsa MUTLAKA bunu çağır — panelle aynı tek-doğru motor.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_my_meetings",
    description:
      "Yaklaşan toplantı/randevu kartlarını çıkarır (başlıkta saat formatı veya 'toplantı/yemek/sunum/randevu' geçenler, deadline'ı bugünden ileride). Kullanıcı 'toplantım var mı', 'yarın ne var', 'bu hafta randevular' derse MUTLAKA bunu çağır.",
    input_schema: {
      type: "object",
      properties: { days_ahead: { type: "integer", default: 14 } },
      required: [],
    },
  },
  {
    name: "what_if",
    description:
      "Bir değişikliğin etkisini YAZMADAN simüle eder (örn. 'Backlog'taki tüm P1'leri Todo'ya alsam kaç kart taşınır', 'Erdinç'in işlerini Done yapsam ne olur'). Kullanıcı 'şunu yapsam ne olur', 'kaç tanesi etkilenir' diye sorarsa MUTLAKA bunu çağır. Asla veri değiştirmez.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["move", "set_priority", "assign", "archive"],
          description: "Simüle edilecek aksiyon",
        },
        filter_column: { type: "string" },
        filter_priority: { type: "string" },
        filter_assignee: { type: "string" },
        target_column: { type: "string" },
        target_priority: { type: "string" },
        target_assignee: { type: "string" },
      },
      required: ["action"],
    },
  },
  {
    name: "get_audit_log",
    description:
      "Son kart eylemlerini (oluşturma/taşıma/done) kanban_activity'den döndürür. Kullanıcı 'son ne yapıldı', 'geçmiş', 'kim taşımış' derse MUTLAKA bunu çağır.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "integer", default: 15 } },
      required: [],
    },
  },
  {
    name: "ui_command",
    description:
      "Board arayüzünü SÜRER: filtreler, kart vurgular, görünüm değiştirir. Kullanıcı 'P0'ları göster', 'Erdinç'in işlerini filtrele', 'şu kartı bul', 'timeline'a geç' derse MUTLAKA bunu çağır — sadece anlatma, gerçekten ekranı değiştir.",
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          enum: ["filter", "clear_filter", "highlight_card", "set_view"],
        },
        priority: { type: "string" },
        assignee: { type: "string" },
        label: { type: "string" },
        column: { type: "string" },
        search: { type: "string" },
        cardId: { type: "string" },
        view: { type: "string", enum: ["board", "timeline"] },
      },
      required: ["command"],
    },
  },
  {
    name: "propose_mutation",
    description:
      "Kart DEĞİŞİKLİĞİ önerir (taşı/öncelik/atama/tarih/arşiv/yeni kart). ASLA doğrudan yazmaz — kullanıcıya onay kartı çıkar, kullanıcı onaylayınca uygulanır. Kullanıcı 'şu kartı Done yap', 'bunu Erdinç'e ata', 'yeni kart ekle', 'şunları arşivle' derse MUTLAKA bunu çağır. Önce query ile kart id'lerini bul.",
    input_schema: {
      type: "object",
      properties: {
        summary_tr: { type: "string", description: "Önerinin Türkçe tek-cümle özeti" },
        operations: {
          type: "array",
          description: "Uygulanacak operasyonlar",
          items: {
            type: "object",
            properties: {
              op: {
                type: "string",
                enum: ["move_card", "set_priority", "assign_card", "set_due_date", "archive_card", "create_card"],
              },
              entity_id: { type: "string", description: "kanban_cards.id (create_card hariç zorunlu)" },
              fields: { type: "object", description: "Op'a göre alanlar (column_name/priority/assignee/due_date/title vb.)" },
              reason: { type: "string" },
            },
            required: ["op", "reason"],
          },
        },
      },
      required: ["summary_tr", "operations"],
    },
  },
];

/* ── Server araç yürütücü ── */

const ROW_CLAMP = 50;

export async function executeTodusServerTool(
  name: string,
  input: Record<string, unknown>,
  _user: SagkolUser,
): Promise<ServerToolResult> {
  const c = db();

  switch (name) {
    case "query_kanban_cards": {
      let q = c
        .from("kanban_cards")
        .select("id, title, column_name, priority, assignee, due_date, labels, source_pdf, source_page_number")
        .eq("is_archived", false)
        .order("priority")
        .limit(Math.min((input.limit as number) ?? 25, ROW_CLAMP));
      if (input.search_term) q = q.or(`title.ilike.%${input.search_term}%,description.ilike.%${input.search_term}%`);
      if (input.column_name) q = q.eq("column_name", input.column_name as string);
      if (input.priority) q = q.eq("priority", input.priority as string);
      if (input.assignee) q = q.eq("assignee", input.assignee as string);
      if (input.label) q = q.contains("labels", [input.label as string]);
      if (input.due_within_days) {
        const today = new Date().toISOString().slice(0, 10);
        const until = new Date(Date.now() + Number(input.due_within_days) * 86_400_000).toISOString().slice(0, 10);
        q = q.gte("due_date", today).lte("due_date", until);
      }
      const { data, error } = await q;
      if (error) return { result: { error: error.message }, summary: "Sorgu hatası", isError: true };
      return { result: { count: data?.length ?? 0, cards: data }, summary: `${data?.length ?? 0} kart bulundu`, isError: false };
    }

    case "query_oz_notes": {
      let q = c
        .from("oz_notes")
        .select("source_pdf, page_number, summary, people, organizations, categories, priority")
        .eq("status", "parsed")
        .limit(Math.min((input.limit as number) ?? 8, 20));
      if (input.search_term) q = q.or(`summary.ilike.%${input.search_term}%,raw_transcription.ilike.%${input.search_term}%`);
      if (input.person) q = q.contains("people", [input.person as string]);
      if (input.organization) q = q.contains("organizations", [input.organization as string]);
      if (input.source_pdf) q = q.eq("source_pdf", input.source_pdf as string);
      const { data, error } = await q;
      if (error) return { result: { error: error.message }, summary: "Sorgu hatası", isError: true };
      return { result: { count: data?.length ?? 0, notes: data, uyari: "Transkripsiyonlar el yazısından okundu, belirsizlik olabilir." }, summary: `${data?.length ?? 0} not`, isError: false };
    }

    case "get_board_stats": {
      const { data, error } = await c
        .from("kanban_cards")
        .select("column_name, priority, assignee, due_date")
        .eq("is_archived", false);
      if (error) return { result: { error: error.message }, summary: "Hata", isError: true };
      const rows = data ?? [];
      const today = new Date().toISOString().slice(0, 10);
      const week = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
      const byCol: Record<string, number> = {};
      const byPri: Record<string, number> = {};
      const byAss: Record<string, number> = {};
      for (const r of rows) {
        byCol[r.column_name] = (byCol[r.column_name] ?? 0) + 1;
        byPri[r.priority] = (byPri[r.priority] ?? 0) + 1;
        byAss[r.assignee] = (byAss[r.assignee] ?? 0) + 1;
      }
      const dueWeek = rows.filter((r) => r.due_date && r.due_date >= today && r.due_date <= week && r.column_name !== "Done").length;
      return {
        result: { toplam: rows.length, kolona_gore: byCol, oncelige_gore: byPri, atanana_gore: byAss, bu_hafta_deadline: dueWeek },
        summary: `${rows.length} kart · ${byPri.P0 ?? 0} P0 · ${dueWeek} bu hafta`,
        isError: false,
      };
    }

    case "list_my_meetings": {
      const today = new Date().toISOString().slice(0, 10);
      const until = new Date(Date.now() + Number(input.days_ahead ?? 14) * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await c
        .from("kanban_cards")
        .select("id, title, priority, assignee, due_date, source_pdf, source_page_number")
        .eq("is_archived", false)
        .neq("column_name", "Done")
        .gte("due_date", today)
        .lte("due_date", until)
        .order("due_date");
      if (error) return { result: { error: error.message }, summary: "Hata", isError: true };
      const meetings = (data ?? []).filter((r) => /\d{1,2}:\d{2}|toplantı|meeting|yemek|sunum|randevu|görüş/i.test(r.title));
      return { result: { count: meetings.length, meetings }, summary: `${meetings.length} yaklaşan toplantı`, isError: false };
    }

    case "what_if": {
      // Yazmadan simülasyon: filtreye uyan kartları say
      let q = c.from("kanban_cards").select("id, title, column_name, priority, assignee").eq("is_archived", false);
      if (input.filter_column) q = q.eq("column_name", input.filter_column as string);
      if (input.filter_priority) q = q.eq("priority", input.filter_priority as string);
      if (input.filter_assignee) q = q.eq("assignee", input.filter_assignee as string);
      const { data, error } = await q;
      if (error) return { result: { error: error.message }, summary: "Hata", isError: true };
      const affected = data ?? [];
      const target =
        input.action === "move" ? `→ kolon: ${input.target_column}`
        : input.action === "set_priority" ? `→ öncelik: ${input.target_priority}`
        : input.action === "assign" ? `→ atanan: ${input.target_assignee}`
        : "→ arşivlenir";
      return {
        result: {
          simulasyon: true,
          yazim_yapilmadi: true,
          aksiyon: input.action,
          hedef: target,
          etkilenecek_kart_sayisi: affected.length,
          ornekler: affected.slice(0, 10).map((r) => ({ id: r.id, title: r.title })),
        },
        summary: `What-if: ${affected.length} kart etkilenir (yazım YOK)`,
        isError: false,
      };
    }

    case "get_audit_log": {
      const { data, error } = await c
        .from("kanban_activity")
        .select("card_id, actor, action, details, created_at")
        .order("created_at", { ascending: false })
        .limit(Math.min((input.limit as number) ?? 15, ROW_CLAMP));
      if (error) return { result: { error: error.message }, summary: "Hata", isError: true };
      return { result: { count: data?.length ?? 0, events: data }, summary: `${data?.length ?? 0} eylem`, isError: false };
    }

    default:
      return { result: { error: `Bilinmeyen araç: ${name}` }, summary: "Bilinmeyen araç", isError: true };
  }
}
