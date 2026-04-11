"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SkillType } from "@/lib/types";

export type ArenaPair = {
  matchId: string;
  type: SkillType;
  a: ArenaSkill;
  b: ArenaSkill;
};

export type ArenaSkill = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: SkillType;
  tags: string[];
  homepage_url: string | null;
  source_url: string | null;
  rating: number;
  wins: number;
  losses: number;
};

const ALLOWED_TYPES: SkillType[] = [
  "mcp_server",
  "claude_skill",
  "gpt",
  "cursor_rule",
  "prompt",
  "agent",
];

function isSkillType(v: string): v is SkillType {
  return (ALLOWED_TYPES as string[]).includes(v);
}

/**
 * Creates a new match for the current user on the given type and returns
 * the two skills to render. Throws if the user isn't authenticated or if
 * fewer than 2 skills exist for the type.
 */
export async function getNextPair(type: SkillType): Promise<ArenaPair | null> {
  if (!isSkillType(type)) throw new Error("Invalid type");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = encodeURIComponent(`/arena?type=${type}`);
    redirect(`/login?next=${next}`);
  }

  const { data: pairRows, error: pairError } = await supabase.rpc(
    "sd_arena_next_pair",
    { p_type: type, p_voter_id: user.id }
  );
  if (pairError) throw new Error(pairError.message);
  const pair = pairRows?.[0];
  if (!pair) return null;

  type SkillRow = {
    id: string;
    slug: string;
    title: string;
    summary: string;
    type: string;
    tags: string[] | null;
    homepage_url: string | null;
    source_url: string | null;
  };
  const { data: skills, error: skillsError } = await supabase
    .from("sd_skills")
    .select(
      "id, slug, title, summary, type, tags, homepage_url, source_url"
    )
    .in("id", [pair.skill_a_id, pair.skill_b_id])
    .returns<SkillRow[]>();
  if (skillsError) throw new Error(skillsError.message);
  if (!skills || skills.length !== 2) return null;

  const { data: ratings } = await supabase
    .from("sd_arena_ratings")
    .select("skill_id, rating, wins, losses")
    .eq("type", type)
    .in("skill_id", [pair.skill_a_id, pair.skill_b_id])
    .returns<{ skill_id: string; rating: number; wins: number; losses: number }[]>();

  function decorate(row: SkillRow): ArenaSkill {
    const r = ratings?.find((x) => x.skill_id === row.id);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      type: row.type as SkillType,
      tags: row.tags ?? [],
      homepage_url: row.homepage_url,
      source_url: row.source_url,
      rating: Math.round(r?.rating ?? 1000),
      wins: r?.wins ?? 0,
      losses: r?.losses ?? 0,
    };
  }

  const a = skills.find((s) => s.id === pair.skill_a_id);
  const b = skills.find((s) => s.id === pair.skill_b_id);
  if (!a || !b) return null;

  return {
    matchId: pair.match_id,
    type,
    a: decorate(a),
    b: decorate(b),
  };
}

export type SubmitVoteResult =
  | { ok: true; skipped: boolean }
  | { ok: false; error: string };

export async function submitArenaVote(
  matchId: string,
  winnerId: string | null
): Promise<SubmitVoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase.rpc("sd_arena_submit_vote", {
    p_match_id: matchId,
    p_winner_id: winnerId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/arena");
  revalidatePath("/arena/leaderboard");
  return { ok: true, skipped: winnerId === null };
}
