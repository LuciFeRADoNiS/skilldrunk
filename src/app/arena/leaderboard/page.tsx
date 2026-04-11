import Link from "next/link";
import type { Metadata } from "next";
import { Swords, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { SKILL_TYPE_LABELS, type SkillType } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arena Leaderboard — skilldrunk",
  description:
    "Elo leaderboard for AI skills. Ranked by head-to-head arena votes from the skilldrunk community.",
};

const ORDERED_TYPES: SkillType[] = [
  "mcp_server",
  "claude_skill",
  "gpt",
  "cursor_rule",
  "prompt",
  "agent",
];

function resolveType(raw: string | undefined): SkillType {
  if (raw && (ORDERED_TYPES as string[]).includes(raw)) {
    return raw as SkillType;
  }
  return "mcp_server";
}

type LeaderboardRow = {
  skill_id: string;
  rating: number;
  wins: number;
  losses: number;
  matches_count: number;
  sd_skills: {
    slug: string;
    title: string;
    summary: string;
    tags: string[] | null;
  } | null;
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const selectedType = resolveType(type);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sd_arena_ratings")
    .select(
      "skill_id, rating, wins, losses, matches_count, sd_skills!inner(slug, title, summary, tags)"
    )
    .eq("type", selectedType)
    .order("rating", { ascending: false })
    .limit(100)
    .returns<LeaderboardRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).filter((r) => r.sd_skills);
  const played = rows.filter((r) => r.matches_count > 0);
  const unplayed = rows.filter((r) => r.matches_count === 0);

  return (
    <main className="flex-1">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
              <Trophy className="h-8 w-8 text-amber-500" />
              Leaderboard
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Elo ranking built from Arena head-to-head votes. Only skills that
              have played at least one match appear ranked.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/arena?type=${selectedType}`}>
              <Swords className="h-4 w-4" />
              Vote in arena
            </Link>
          </Button>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {ORDERED_TYPES.map((t) => (
            <Button
              key={t}
              asChild
              size="sm"
              variant={t === selectedType ? "default" : "outline"}
              className="font-mono text-xs"
            >
              <Link href={`/arena/leaderboard?type=${t}`}>
                {SKILL_TYPE_LABELS[t]}
              </Link>
            </Button>
          ))}
        </div>

        {played.length === 0 ? (
          <Card className="py-12 text-center">
            <CardHeader>
              <CardTitle>No matches yet</CardTitle>
              <CardDescription>
                No one has voted in the {SKILL_TYPE_LABELS[selectedType]} arena yet.
                Be the first —{" "}
                <Link
                  href={`/arena?type=${selectedType}`}
                  className="underline hover:text-foreground"
                >
                  cast a vote
                </Link>
                .
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ol className="space-y-2">
            {played.map((row, idx) => (
              <li key={row.skill_id}>
                <Link
                  href={`/s/${row.sd_skills!.slug}`}
                  className="flex items-center gap-4 rounded-lg border bg-background p-4 transition hover:border-foreground/30 hover:shadow-sm"
                >
                  <span className="w-8 text-right font-mono text-sm text-muted-foreground">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">
                        {row.sd_skills!.title}
                      </h3>
                      {row.sd_skills!.tags?.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="hidden font-mono text-[10px] sm:inline-flex"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {row.sd_skills!.summary}
                    </p>
                  </div>
                  <div className="flex flex-col items-end text-right font-mono text-xs">
                    <span className="text-lg font-semibold tabular-nums text-foreground">
                      {Math.round(row.rating)}
                    </span>
                    <span className="text-muted-foreground">
                      {row.wins}W · {row.losses}L
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {unplayed.length > 0 && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            {unplayed.length} more {SKILL_TYPE_LABELS[selectedType]}
            {unplayed.length === 1 ? "" : "s"} waiting for their first match.
          </p>
        )}
      </div>
    </main>
  );
}
