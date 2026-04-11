export type SkillType =
  | "claude_skill"
  | "gpt"
  | "mcp_server"
  | "cursor_rule"
  | "prompt"
  | "agent";

export const SKILL_TYPE_LABELS: Record<SkillType, string> = {
  claude_skill: "Claude Skill",
  gpt: "Custom GPT",
  mcp_server: "MCP Server",
  cursor_rule: "Cursor Rule",
  prompt: "Prompt",
  agent: "Agent",
};

export const SKILL_TYPE_COLORS: Record<SkillType, string> = {
  claude_skill: "bg-orange-500/10 text-orange-600 border-orange-200",
  gpt: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  mcp_server: "bg-blue-500/10 text-blue-600 border-blue-200",
  cursor_rule: "bg-purple-500/10 text-purple-600 border-purple-200",
  prompt: "bg-amber-500/10 text-amber-600 border-amber-200",
  agent: "bg-pink-500/10 text-pink-600 border-pink-200",
};

export type Skill = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: SkillType;
  author_id: string | null;
  body_mdx: string;
  logo_url: string | null;
  homepage_url: string | null;
  source_url: string | null;
  install_command: string | null;
  tags: string[];
  category: string | null;
  license: string | null;
  status: "draft" | "published" | "archived";
  metadata: Record<string, unknown>;
  upvotes_count: number;
  downvotes_count: number;
  comments_count: number;
  score: number;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_handle: string | null;
  website: string | null;
  created_at: string;
};

export type Comment = {
  id: string;
  skill_id: string;
  parent_id: string | null;
  author_id: string;
  body_md: string;
  upvotes_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  replies?: Comment[];
};
