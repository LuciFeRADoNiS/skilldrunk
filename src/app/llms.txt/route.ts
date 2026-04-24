import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const { data: skills } = await supabase
    .from("sd_skills")
    .select("slug, title, type, summary, tags")
    .eq("status", "published")
    .order("score", { ascending: false })
    .limit(200);

  const { count: totalSkills } = await supabase
    .from("sd_skills")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");

  const lines: string[] = [
    "# skilldrunk.com",
    "",
    "> The community-driven library for AI skills. Discover, discuss, and rank Claude Skills, MCP servers, Custom GPTs, Cursor rules, prompts, and agents.",
    "",
    "## About",
    "",
    `skilldrunk is a Reddit-style platform for AI skills with ${totalSkills ?? 0}+ published skills. Users vote, review, and compete skills head-to-head in an Elo-rated arena. The community builds the leaderboard.`,
    "",
    "## Skill Types",
    "",
    "- Claude Skill: Custom instructions and capabilities for Claude",
    "- MCP Server: Model Context Protocol servers for tool use",
    "- Custom GPT: Specialized ChatGPT configurations",
    "- Cursor Rule: Code editor rules for Cursor IDE",
    "- Prompt: Reusable prompt templates",
    "- Agent: Autonomous AI agent configurations",
    "",
    "## Key Pages",
    "",
    "- https://skilldrunk.com/ — Homepage with trending skills",
    "- https://skilldrunk.com/feed — Browse all skills by type, sorted by votes",
    "- https://skilldrunk.com/arena — Head-to-head skill voting (Elo rated)",
    "- https://skilldrunk.com/arena/leaderboard — Community-voted skill rankings",
    "- https://skilldrunk.com/search — Full-text search across all skills",
    "- https://skilldrunk.com/docs — Documentation",
    "- https://skilldrunk.com/docs/api — REST API for developers",
    "- https://skilldrunk.com/docs/mcp — MCP server for AI assistants",
    "",
    "## API",
    "",
    "REST API at https://skilldrunk.com/api/v1/ — endpoints:",
    "- GET /api/v1/skills — List/search skills",
    "- GET /api/v1/skills/:slug — Get skill details",
    "- GET /api/v1/skills/:slug/comments — Get comments",
    "- POST /api/v1/skills/:slug/vote — Vote on a skill",
    "- GET /api/v1/me — Current user profile",
    "",
    "## MCP Server",
    "",
    "Two transports:",
    "- stdio: npx -y @skilldrunk/mcp  (Claude Desktop, Cursor, Windsurf)",
    "- Streamable HTTP: POST https://skilldrunk.com/api/mcp  (Smithery, hosted clients)",
    "",
    "Tools: search_skills, get_skill, list_comments, vote_skill, comment_on_skill, whoami",
    "Optional auth: Authorization: Bearer sd_live_xxx (write tools require it)",
    "",
    "## Top Skills",
    "",
  ];

  for (const s of skills ?? []) {
    const tags = (s.tags as string[])?.slice(0, 3).join(", ") ?? "";
    lines.push(
      `- [${s.title}](https://skilldrunk.com/s/${s.slug}) (${s.type}${tags ? `, ${tags}` : ""}): ${s.summary}`
    );
  }

  lines.push(
    "",
    "---",
    `Generated ${new Date().toISOString().split("T")[0]}. Full data at https://skilldrunk.com/sitemap.xml`
  );

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
