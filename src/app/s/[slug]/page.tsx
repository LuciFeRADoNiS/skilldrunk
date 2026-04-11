import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VoteButtons } from "@/components/vote-buttons";
import { CommentSection } from "@/components/comment-section";
import { Markdown } from "@/components/markdown";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import {
  SKILL_TYPE_COLORS,
  SKILL_TYPE_LABELS,
  type Skill,
  type Profile,
  type Comment,
} from "@/lib/types";

type Params = { slug: string };

async function getSkillBySlug(slug: string) {
  const supabase = await createClient();
  const { data: skill, error } = await supabase
    .from("sd_skills")
    .select("*, author:sd_profiles!sd_skills_author_id_fkey(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("skill fetch error", error);
    return null;
  }

  return skill as (Skill & { author: Profile | null }) | null;
}

async function getComments(skillId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sd_comments")
    .select("*, author:sd_profiles!sd_comments_author_id_fkey(*)")
    .eq("skill_id", skillId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  return (data ?? []) as Comment[];
}

async function getMyVote(skillId: string): Promise<-1 | 0 | 1> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from("sd_votes")
    .select("value")
    .eq("skill_id", skillId)
    .eq("user_id", user.id)
    .maybeSingle();
  return ((data?.value as -1 | 1) ?? 0) as -1 | 0 | 1;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) return { title: "Skill not found" };
  return {
    title: skill.title,
    description: skill.summary,
    openGraph: {
      title: skill.title,
      description: skill.summary,
      type: "article",
    },
  };
}

export default async function SkillPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) notFound();

  const [comments, myVote] = await Promise.all([
    getComments(skill.id),
    getMyVote(skill.id),
  ]);

  return (
    <>
      <SiteHeader />
      <article className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex gap-6">
          <VoteButtons
            skillId={skill.id}
            initialScore={skill.score}
            initialVote={myVote}
          />

          <div className="flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={SKILL_TYPE_COLORS[skill.type]} variant="outline">
                {SKILL_TYPE_LABELS[skill.type]}
              </Badge>
              {skill.tags.slice(0, 5).map((tag) => (
                <Link key={tag} href={`/tag/${tag}`}>
                  <Badge variant="secondary">#{tag}</Badge>
                </Link>
              ))}
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {skill.title}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">{skill.summary}</p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {skill.author && (
                <Link
                  href={`/u/${skill.author.username}`}
                  className="hover:text-foreground"
                >
                  by @{skill.author.username}
                </Link>
              )}
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {skill.comments_count}
              </span>
              {skill.source_url && (
                <a
                  href={skill.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                  Source
                </a>
              )}
              {skill.homepage_url && (
                <a
                  href={skill.homepage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                  Homepage
                </a>
              )}
            </div>

            {skill.install_command && (
              <pre className="mt-5 overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-sm">
                <code>{skill.install_command}</code>
              </pre>
            )}

            <Separator className="my-8" />

            <Markdown>
              {skill.body_mdx || "_No description yet._"}
            </Markdown>

            <Separator className="my-10" />

            <CommentSection skillId={skill.id} initialComments={comments} />
          </div>
        </div>
      </article>
    </>
  );
}
