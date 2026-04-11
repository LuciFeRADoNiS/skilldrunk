import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SkillCard } from "@/components/skill-card";
import { SKILL_TYPE_LABELS, type Skill, type SkillType } from "@/lib/types";

export const metadata: Metadata = {
  title: "Trending skills",
  description: "The top AI skills on skilldrunk — voted by the community.",
};

type SearchParams = { type?: string };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { type } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("sd_skills")
    .select(
      "slug, title, summary, type, tags, score, comments_count, created_at"
    )
    .eq("status", "published")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (type && type in SKILL_TYPE_LABELS) {
    query = query.eq("type", type);
  }

  const { data: skills } = await query;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trending</h1>
            <p className="mt-1 text-muted-foreground">
              The highest-rated skills this week.
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <TypeFilter current={type} label="All" target={undefined} />
          {(Object.keys(SKILL_TYPE_LABELS) as SkillType[]).map((t) => (
            <TypeFilter
              key={t}
              current={type}
              label={SKILL_TYPE_LABELS[t]}
              target={t}
            />
          ))}
        </div>

        {!skills || skills.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(skills as Skill[]).map((s) => (
              <SkillCard key={s.slug} skill={s} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function TypeFilter({
  current,
  target,
  label,
}: {
  current: string | undefined;
  target: string | undefined;
  label: string;
}) {
  const href = target ? `/feed?type=${target}` : "/feed";
  const active = current === target || (!current && !target);
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed p-12 text-center">
      <p className="text-muted-foreground">
        No skills yet. Be the first —{" "}
        <Link href="/new" className="font-semibold text-foreground underline">
          submit one
        </Link>
        .
      </p>
    </div>
  );
}
