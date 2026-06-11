import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TodusApp } from "./board-view";
import "./todus.css";

export const metadata: Metadata = {
  title: "tÖdÜs 👑 — Özgür's Brain System",
  description:
    "tÖdÜs — centralized task management. Özgür'ün el yazısı notlarından (oznotes1-8.pdf) canlı Supabase kanban.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👑</text></svg>",
  },
};

export const dynamic = "force-dynamic";

export type TodusCard = {
  id: string;
  title: string;
  description: string | null;
  column_name: string;
  priority: string;
  assignee: string;
  due_date: string | null;
  labels: string[];
  source_pdf: string | null;
  source_page_number: number | null;
  created_at: string;
};

export default async function TodusPage() {
  const supabase = await createClient();

  const [{ data: cards, error }, authState] = await Promise.all([
    supabase
      .from("kanban_cards")
      .select(
        "id, title, description, column_name, priority, assignee, due_date, labels, source_pdf, source_page_number, created_at",
      )
      .eq("is_archived", false)
      .order("priority")
      .order("due_date", { ascending: true, nullsFirst: false })
      .returns<TodusCard[]>(),
    supabase.auth.getUser(),
  ]);

  // Admin ise kart taşıma/ekleme açık
  let canEdit = false;
  const user = authState.data.user;
  if (user) {
    const { data: profile } = await supabase
      .from("sd_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    canEdit = profile?.role === "admin";
  }

  return (
    <TodusApp
      cards={cards ?? []}
      canEdit={canEdit}
      isLoggedIn={!!user}
      loadError={error?.message ?? null}
    />
  );
}
