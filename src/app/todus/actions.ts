"use server";

import { createClient } from "@/lib/supabase/server";

const VALID_COLUMNS = ["Backlog", "Todo", "In Progress", "Review", "Done"];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Giriş gerekli");
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Admin yetkisi gerekli");
  return user;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service config eksik");
  // RLS yazma yetkisi sadece service_role'da — admin doğrulaması üstte yapıldı
  return import("@supabase/supabase-js").then(({ createClient: cc }) =>
    cc(url, key, { auth: { persistSession: false } }),
  );
}

export async function moveCard(
  cardId: string,
  columnName: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!VALID_COLUMNS.includes(columnName))
      return { ok: false, error: "Geçersiz kolon" };
    const svc = await serviceClient();
    const { error } = await svc
      .from("kanban_cards")
      .update({ column_name: columnName })
      .eq("id", cardId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function addCard(input: {
  title: string;
  column_name: string;
  priority: string;
  assignee: string;
  due_date: string | null;
  label: string | null;
  description: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Başlık boş" };
    if (!VALID_COLUMNS.includes(input.column_name))
      return { ok: false, error: "Geçersiz kolon" };
    if (!["P0", "P1", "P2", "P3"].includes(input.priority))
      return { ok: false, error: "Geçersiz öncelik" };

    const svc = await serviceClient();
    const { data: board } = await svc
      .from("kanban_boards")
      .select("id")
      .eq("slug", "todus-ozgur-personal")
      .single();
    if (!board) return { ok: false, error: "Board bulunamadı" };

    const labels = ["manual"];
    if (input.label) labels.push(input.label);

    const { error } = await svc.from("kanban_cards").insert({
      board_id: board.id,
      title: title.slice(0, 200),
      description: input.description?.trim() || null,
      column_name: input.column_name,
      priority: input.priority,
      assignee: input.assignee || "ozgur",
      due_date: input.due_date || null,
      labels,
      created_by: "todus-ui",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
