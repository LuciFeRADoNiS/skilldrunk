import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/site-header";
import { SkillCard } from "@/components/skill-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Skill } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search skills",
  description:
    "Search the skilldrunk library — find Claude Skills, MCP servers, GPTs, prompts, and more.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();
  let skills: Skill[] = [];

  if (query) {
    const { data } = await supabase
      .from("sd_skills")
      .select(
        "slug, title, summary, type, tags, score, comments_count, created_at"
      )
      .eq("status", "published")
      .textSearch("search_vector", query, { type: "websearch" })
      .order("score", { ascending: false })
      .limit(50);
    skills = (data ?? []) as Skill[];

    // Log search (fire-and-forget via service_role)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      admin
        .from("sd_search_logs")
        .insert({
          query,
          results_count: skills.length,
          user_id: user?.id ?? null,
        })
        .then(() => {});
    } catch {}
  }

  // Trending searches (top 10, last 7 days)
  let trendingSearches: { query: string; count: number }[] = [];
  if (!query) {
    try {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await admin.rpc("sd_admin_stats");
      const stats = data as { top_searches?: { query: string; count: number }[] } | null;
      trendingSearches = stats?.top_searches?.slice(0, 10) ?? [];
    } catch {}
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>

        <form action="/search" method="get" className="mt-6 flex gap-2">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search skills, tags, descriptions..."
            className="h-11 flex-1 text-base"
            autoFocus
          />
          <Button type="submit" size="lg">
            Search
          </Button>
        </form>

        {query === "" ? (
          <div className="mt-8">
            <p className="text-sm text-muted-foreground">
              Type something to search the library.
            </p>
            {trendingSearches.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trending searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((s) => (
                    <Link key={s.query} href={`/search?q=${encodeURIComponent(s.query)}`}>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer text-xs transition hover:bg-muted-foreground/20"
                      >
                        {s.query}
                        <span className="ml-1 opacity-50">{s.count}</span>
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : skills.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            No results for{" "}
            <span className="font-mono text-foreground">{query}</span>. Try
            different keywords or{" "}
            <Link href="/new" className="underline">
              submit
            </Link>{" "}
            one.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {skills.map((s) => (
              <SkillCard key={s.slug} skill={s} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
