import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SkillCard } from "@/components/skill-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Skill } from "@/lib/types";

export const metadata: Metadata = {
  title: "Search skills",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let skills: Skill[] = [];
  if (query) {
    const supabase = await createClient();
    // Postgres full-text search against the generated tsvector column.
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
          <p className="mt-8 text-sm text-muted-foreground">
            Type something to search the library.
          </p>
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
