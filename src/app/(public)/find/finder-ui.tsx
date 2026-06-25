"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Sparkles, Send, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  SKILL_TYPE_COLORS,
  SKILL_TYPE_LABELS,
  type SkillType,
} from "@/lib/types";

type Hit = {
  slug: string;
  title: string;
  summary: string;
  type: SkillType;
  tags: string[];
  score: number;
  reasoning?: string;
};

type FinderResult = {
  query: string;
  skills: Hit[];
  usedLLM: boolean;
};

const EXAMPLES = [
  "React projemde API testlerini otomatikleştirmek istiyorum",
  "Claude ile meeting notes'larımı özetleyecek bir skill",
  "Database schema design helper",
  "MCP server that reads my Obsidian vault",
];

export function FinderUI() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<FinderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!query.trim()) return;

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/find", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(json.error ?? `http_${res.status}`);
      }
      const data = (await res.json()) as FinderResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setPending(false);
    }
  }

  function useExample(ex: string) {
    setQuery(ex);
  }

  return (
    <div>
      {/* Input */}
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Örn: Claude ile günlük takvimi özetleyen bir skill arıyorum…"
            rows={3}
            className="resize-none pr-16 text-base"
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSubmit(e as unknown as FormEvent);
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            disabled={pending || !query.trim()}
            className="absolute bottom-2 right-2 gap-1.5"
          >
            {pending ? (
              <>
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Aranıyor…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Bul
              </>
            )}
          </Button>
        </div>

        {!result && !pending && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">
              Örnekler:
            </span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => useExample(ex)}
                className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:border-orange-300 hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Results */}
      {error && (
        <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Hata: {error}
        </div>
      )}

      {result && (
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {result.skills.length > 0
                ? `${result.skills.length} sonuç`
                : "Sonuç bulunamadı"}
            </span>
            <span className="font-mono">
              {result.usedLLM ? "✦ AI ranked" : "keyword match"}
            </span>
          </div>

          {result.skills.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Eşleşen skill bulamadık.{" "}
              <Link href="/feed" className="underline hover:text-foreground">
                Tüm skill'lere göz at
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {result.skills.map((hit, i) => (
                <li key={hit.slug}>
                  <Link
                    href={`/s/${hit.slug}`}
                    className="group block rounded-xl border bg-background p-4 transition hover:border-orange-300 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={SKILL_TYPE_COLORS[hit.type]}
                          >
                            {SKILL_TYPE_LABELS[hit.type]}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {hit.score}
                          </span>
                        </div>
                        <h3 className="font-semibold group-hover:underline">
                          {hit.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {hit.summary}
                        </p>
                        {hit.reasoning && (
                          <p className="mt-2 rounded-md bg-orange-500/5 px-3 py-1.5 text-xs text-orange-700 dark:text-orange-300">
                            <Sparkles className="mr-1 inline h-3 w-3" />
                            {hit.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setQuery("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Yeni arama yap ↻
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
