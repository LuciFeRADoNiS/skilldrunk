import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getNextPair } from "@/app/actions/arena";
import type { SkillType } from "@/lib/types";
import { ArenaClient } from "./arena-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arena — skilldrunk",
  description:
    "Vote head-to-head on AI skills. Two skills enter, one leaves with a higher Elo. The crowd builds the leaderboard.",
};

const ALLOWED_TYPES: SkillType[] = [
  "mcp_server",
  "claude_skill",
  "gpt",
  "cursor_rule",
  "prompt",
  "agent",
];

function resolveType(raw: string | undefined): SkillType {
  if (raw && (ALLOWED_TYPES as string[]).includes(raw)) {
    return raw as SkillType;
  }
  return "mcp_server";
}

export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const selectedType = resolveType(type);
  const pair = await getNextPair(selectedType);

  return (
    <main className="flex-1">
      <SiteHeader />
      <ArenaClient pair={pair} selectedType={selectedType} />
    </main>
  );
}
