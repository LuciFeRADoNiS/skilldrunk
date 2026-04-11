import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SkillCard } from "@/components/skill-card";
import type { Skill } from "@/lib/types";

type Params = { tag: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `#${tag}`,
    description: `Skills tagged with #${tag}.`,
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { tag } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("sd_skills")
    .select(
      "slug, title, summary, type, tags, score, comments_count, created_at"
    )
    .eq("status", "published")
    .contains("tags", [tag])
    .order("score", { ascending: false })
    .limit(100);

  const skills = (data ?? []) as Skill[];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-mono text-3xl font-bold tracking-tight">#{tag}</h1>
        <p className="mt-1 text-muted-foreground">
          {skills.length} skill{skills.length === 1 ? "" : "s"} tagged with this.
        </p>

        {skills.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            Nothing here yet.
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
