import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SkillCard } from "@/components/skill-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile, Skill } from "@/lib/types";

type Params = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const typedProfile = profile as Profile;

  const { data: skillsData } = await supabase
    .from("sd_skills")
    .select(
      "slug, title, summary, type, tags, score, comments_count, created_at"
    )
    .eq("author_id", typedProfile.id)
    .eq("status", "published")
    .order("score", { ascending: false });

  const skills = (skillsData ?? []) as Skill[];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20">
            <AvatarImage src={typedProfile.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl">
              {typedProfile.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              @{typedProfile.username}
            </h1>
            {typedProfile.display_name && (
              <p className="text-muted-foreground">
                {typedProfile.display_name}
              </p>
            )}
            {typedProfile.bio && (
              <p className="mt-2 max-w-lg text-sm">{typedProfile.bio}</p>
            )}
          </div>
        </div>

        <h2 className="mt-10 text-xl font-semibold">
          Published skills{" "}
          <span className="text-muted-foreground">({skills.length})</span>
        </h2>

        {skills.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No skills published yet.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {skills.map((s) => (
              <SkillCard key={s.slug} skill={s} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
