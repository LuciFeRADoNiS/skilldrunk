import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Search,
  Swords,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SkillCard } from "@/components/skill-card";
import { createClient } from "@/lib/supabase/server";
import {
  SKILL_TYPE_LABELS,
  SKILL_TYPE_COLORS,
  type SkillType,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const SKILL_TYPES: SkillType[] = [
  "mcp_server",
  "claude_skill",
  "gpt",
  "cursor_rule",
  "prompt",
  "agent",
];

export default async function HomePage() {
  const supabase = await createClient();

  // Trending skills (top 8)
  const { data: trending } = await supabase
    .from("sd_skills")
    .select("slug, title, summary, type, tags, score, comments_count")
    .eq("status", "published")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  // Skill type counts
  const { data: typeCounts } = await supabase
    .from("sd_skills")
    .select("type")
    .eq("status", "published");

  const countByType: Partial<Record<SkillType, number>> = {};
  for (const row of typeCounts ?? []) {
    const t = row.type as SkillType;
    countByType[t] = (countByType[t] ?? 0) + 1;
  }
  const totalSkills = typeCounts?.length ?? 0;

  // Top arena skills (3)
  type ArenaRow = {
    skill_id: string;
    rating: number;
    wins: number;
    losses: number;
    sd_skills: { slug: string; title: string; type: string } | null;
  };
  const { data: arenaTop } = await supabase
    .from("sd_arena_ratings")
    .select("skill_id, rating, wins, losses, sd_skills!inner(slug, title, type)")
    .gt("matches_count", 0)
    .order("rating", { ascending: false })
    .limit(3)
    .returns<ArenaRow[]>();

  return (
    <main className="flex-1">
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(249,115,22,0.15), transparent 40%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.12), transparent 40%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            The library for{" "}
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 bg-clip-text text-transparent">
              AI skills
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
            Discover, discuss, and rank the skills that make AI agents useful.
            Upvoted by the people who actually ship with them.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/feed">
                <TrendingUp className="h-4 w-4" />
                Browse skills
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
            >
              <Link href="/arena">
                <Swords className="h-4 w-4" />
                Enter the Arena
              </Link>
            </Button>
          </div>

          {/* Type pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {SKILL_TYPES.map((t) => (
              <Link key={t} href={`/feed?type=${t}`}>
                <Badge
                  className={`${SKILL_TYPE_COLORS[t]} cursor-pointer transition hover:opacity-80`}
                  variant="outline"
                >
                  {SKILL_TYPE_LABELS[t]}
                  {countByType[t] ? (
                    <span className="ml-1.5 font-mono text-[10px] opacity-60">
                      {countByType[t]}
                    </span>
                  ) : null}
                </Badge>
              </Link>
            ))}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {totalSkills} skills and counting
          </p>
        </div>
      </section>

      {/* ── Trending ── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <TrendingUp className="h-6 w-6 text-orange-500" />
                Trending
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Top skills voted by the community
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/feed">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {trending && trending.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trending.map((skill) => (
                <SkillCard
                  key={skill.slug}
                  skill={skill as Parameters<typeof SkillCard>[0]["skill"]}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No skills published yet. Be the first!
            </p>
          )}
        </div>
      </section>

      {/* ── Arena preview ── */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Swords className="h-6 w-6 text-orange-500" />
                Arena
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Head-to-head voting — the crowd builds the leaderboard
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/arena/leaderboard">
                Leaderboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Arena CTA card */}
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/50 p-10 text-center dark:border-orange-900 dark:bg-orange-950/20">
              <Swords className="mb-4 h-12 w-12 text-orange-400" />
              <h3 className="text-lg font-semibold">Two skills enter.</h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Pick the one you&apos;d actually use. Your vote updates their
                Elo rating in real time.
              </p>
              <Button asChild className="mt-6" size="lg">
                <Link href="/arena">
                  Start voting <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Top ranked */}
            <div className="rounded-xl border bg-background p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top Ranked
              </h3>
              {arenaTop && arenaTop.length > 0 ? (
                <ol className="space-y-3">
                  {arenaTop.map((row, i) => (
                    <li key={row.skill_id}>
                      <Link
                        href={`/s/${row.sd_skills!.slug}`}
                        className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-muted"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {row.sd_skills!.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.wins}W · {row.losses}L
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs tabular-nums"
                        >
                          {Math.round(row.rating)}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No votes yet — be the first to{" "}
                  <Link href="/arena" className="underline hover:text-foreground">
                    cast a vote
                  </Link>
                  .
                </p>
              )}
              <div className="mt-4 border-t pt-3">
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/arena/leaderboard">
                    View full leaderboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick links ── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/search"
              className="flex items-center gap-3 rounded-xl border bg-background p-5 transition hover:border-foreground/20 hover:shadow-sm"
            >
              <Search className="h-8 w-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Search</h3>
                <p className="text-sm text-muted-foreground">
                  Find any skill by name, tag, or type
                </p>
              </div>
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-3 rounded-xl border bg-background p-5 transition hover:border-foreground/20 hover:shadow-sm"
            >
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Docs</h3>
                <p className="text-sm text-muted-foreground">
                  REST API, MCP server, and integration guides
                </p>
              </div>
            </Link>
            <Link
              href="/new"
              className="flex items-center gap-3 rounded-xl border bg-background p-5 transition hover:border-foreground/20 hover:shadow-sm"
            >
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Submit a skill</h3>
                <p className="text-sm text-muted-foreground">
                  Publish yours and earn reputation
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-mono text-sm font-bold">
              <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
              skilldrunk
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link href="/feed" className="hover:text-foreground">
                Trending
              </Link>
              <Link href="/arena" className="hover:text-foreground">
                Arena
              </Link>
              <Link href="/arena/leaderboard" className="hover:text-foreground">
                Leaderboard
              </Link>
              <Link href="/search" className="hover:text-foreground">
                Search
              </Link>
              <Link href="/docs" className="hover:text-foreground">
                Docs
              </Link>
              <Link href="/docs/api" className="hover:text-foreground">
                API
              </Link>
              <Link href="/docs/mcp" className="hover:text-foreground">
                MCP
              </Link>
              <Link href="/new" className="hover:text-foreground">
                Submit
              </Link>
            </nav>
          </div>
          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <p className="font-mono">
              &copy; {new Date().getFullYear()} skilldrunk
            </p>
            <p>
              Built for builders.{" "}
              <Link
                href="https://github.com/anthropics/skills"
                target="_blank"
                className="underline hover:text-foreground"
              >
                Skills spec
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
