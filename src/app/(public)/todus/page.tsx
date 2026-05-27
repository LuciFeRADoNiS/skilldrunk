import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { BoardView } from "./board-view";

export const metadata: Metadata = {
  title: "tÖdÜs — Özgür Personal Kanban",
  description:
    "Özgür'ün el yazısı PDF notlarından (oznotes1-8.pdf) parse edilmiş 579 yapılacak iş. tÖdÜs kanban spec.",
};

export const dynamic = "force-dynamic";

type Card = {
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
  is_archived: boolean;
};

export default async function TodusPage() {
  const supabase = await createClient();

  const { data: cards, error } = await supabase
    .from("kanban_cards")
    .select(
      "id, title, description, column_name, priority, assignee, due_date, labels, source_pdf, source_page_number, is_archived",
    )
    .eq("is_archived", false)
    .order("priority")
    .order("due_date", { ascending: true, nullsFirst: false })
    .returns<Card[]>();

  const allCards: Card[] = cards ?? [];

  // Stats
  const counts = {
    Todo: allCards.filter((c) => c.column_name === "Todo").length,
    "In Progress": allCards.filter((c) => c.column_name === "In Progress")
      .length,
    Review: allCards.filter((c) => c.column_name === "Review").length,
    Backlog: allCards.filter((c) => c.column_name === "Backlog").length,
    Done: allCards.filter((c) => c.column_name === "Done").length,
  };

  // Assignee distribution
  const byAssignee = new Map<string, number>();
  for (const c of allCards) {
    byAssignee.set(c.assignee, (byAssignee.get(c.assignee) ?? 0) + 1);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              tÖdÜs <span className="text-muted-foreground text-lg font-normal">— Özgür Personal</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {allCards.length} kart • Kaynak: oznotes1-8.pdf (Özgür'ün el yazısı
              notları) • Spec:{" "}
              <a
                href="https://skilldrunk.com/docs/kanban"
                className="underline hover:text-foreground"
              >
                /docs/kanban
              </a>
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded bg-red-500/10 px-2 py-1 text-red-500">
              Todo: {counts.Todo}
            </span>
            <span className="rounded bg-amber-500/10 px-2 py-1 text-amber-500">
              Review: {counts.Review}
            </span>
            <span className="rounded bg-gray-500/10 px-2 py-1 text-gray-500">
              Backlog: {counts.Backlog}
            </span>
            <span className="rounded bg-green-500/10 px-2 py-1 text-green-500">
              Done: {counts.Done}
            </span>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
            Kartlar yüklenemedi: {error.message}. (Auth gerekebilir —{" "}
            <a href="/login" className="underline">
              giriş yap
            </a>
            )
          </div>
        ) : allCards.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Kart bulunamadı. Auth gerekli olabilir.
          </div>
        ) : (
          <BoardView
            cards={allCards}
            byAssignee={Array.from(byAssignee.entries()).sort(
              (a, b) => b[1] - a[1],
            )}
          />
        )}
      </main>
    </>
  );
}
