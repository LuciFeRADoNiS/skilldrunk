"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
};

const COLUMNS = ["Todo", "In Progress", "Review", "Backlog", "Done"] as const;

const PRIORITY_COLOR: Record<string, string> = {
  P0: "bg-red-500/15 text-red-500 border-red-500/30",
  P1: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  P2: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  P3: "bg-gray-500/15 text-gray-500 border-gray-500/30",
};

const COLUMN_COLOR: Record<string, string> = {
  Todo: "border-t-red-500",
  "In Progress": "border-t-blue-500",
  Review: "border-t-amber-500",
  Backlog: "border-t-gray-500",
  Done: "border-t-green-500",
};

export function BoardView({
  cards,
  byAssignee,
}: {
  cards: Card[];
  byAssignee: [string, number][];
}) {
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [pdf, setPdf] = useState<string | null>(null);

  const allPdfs = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards) if (c.source_pdf) s.add(c.source_pdf);
    return Array.from(s).sort();
  }, [cards]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (
        search &&
        !c.title.toLowerCase().includes(search.toLowerCase()) &&
        !(c.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (assignee && c.assignee !== assignee) return false;
      if (priority && c.priority !== priority) return false;
      if (pdf && c.source_pdf !== pdf) return false;
      return true;
    });
  }, [cards, search, assignee, priority, pdf]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            placeholder="Ara: başlık veya açıklama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm"
          />
          <select
            value={assignee ?? ""}
            onChange={(e) => setAssignee(e.target.value || null)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Atanan: Hepsi</option>
            {byAssignee.map(([name, cnt]) => (
              <option key={name} value={name}>
                {name} ({cnt})
              </option>
            ))}
          </select>
          <select
            value={priority ?? ""}
            onChange={(e) => setPriority(e.target.value || null)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Öncelik: Hepsi</option>
            <option value="P0">P0 - Acil</option>
            <option value="P1">P1 - Yüksek</option>
            <option value="P2">P2 - Orta</option>
            <option value="P3">P3 - Düşük</option>
          </select>
          <select
            value={pdf ?? ""}
            onChange={(e) => setPdf(e.target.value || null)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Kaynak PDF: Hepsi</option>
            {allPdfs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {filtered.length} / {cards.length} kart gösteriliyor
          {(search || assignee || priority || pdf) && (
            <button
              onClick={() => {
                setSearch("");
                setAssignee(null);
                setPriority(null);
                setPdf(null);
              }}
              className="ml-2 underline hover:text-foreground"
            >
              Filtreleri sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => {
          const colCards = filtered.filter((c) => c.column_name === col);
          return (
            <div
              key={col}
              className={`rounded-lg border border-t-4 ${COLUMN_COLOR[col]} bg-card`}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <h3 className="font-medium text-sm">{col}</h3>
                <span className="text-xs text-muted-foreground">
                  {colCards.length}
                </span>
              </div>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                {colCards.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    —
                  </div>
                ) : (
                  colCards.slice(0, 50).map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border border-border bg-background p-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium leading-tight">
                          {c.title}
                        </span>
                        <span
                          className={`shrink-0 rounded border px-1 py-0.5 text-[10px] font-mono ${PRIORITY_COLOR[c.priority]}`}
                        >
                          {c.priority}
                        </span>
                      </div>
                      {c.assignee !== "ozgur" && (
                        <div className="mt-1 text-[10px] text-blue-500">
                          → {c.assignee}
                        </div>
                      )}
                      {c.due_date && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          📅 {c.due_date}
                        </div>
                      )}
                      {c.source_pdf && (
                        <div className="mt-1 text-[10px] text-muted-foreground/70">
                          {c.source_pdf} s.{c.source_page_number}
                        </div>
                      )}
                      {c.labels.length > 2 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.labels
                            .filter(
                              (l) =>
                                !["imported", "from-oz-notes"].includes(l),
                            )
                            .slice(0, 3)
                            .map((l) => (
                              <Badge
                                key={l}
                                variant="secondary"
                                className="text-[9px] px-1 py-0"
                              >
                                {l}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {colCards.length > 50 && (
                  <div className="text-center text-[10px] text-muted-foreground py-1">
                    + {colCards.length - 50} kart daha (filtrele)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
