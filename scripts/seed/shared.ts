import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Load .env.local without dotenv.
try {
  const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* ignore */
}

export type SkillType =
  | "claude_skill"
  | "gpt"
  | "mcp_server"
  | "cursor_rule"
  | "prompt"
  | "agent";

export type ImportedSkill = {
  slug: string;
  title: string;
  summary: string;
  type: SkillType;
  body_mdx: string;
  source_url?: string;
  homepage_url?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  status: "published";
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const GH_TOKEN = process.env.GITHUB_TOKEN;

export async function ghFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "skilldrunk-seeder",
      ...(GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status}: ${url}`);
  }
  return res;
}

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function upsertSkills(skills: ImportedSkill[]) {
  const supabase = getSupabase();
  if (!supabase) {
    console.log(
      `[seed] Dry run — ${skills.length} skill(s) parsed. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to write.`
    );
    console.log("[seed] Sample:", JSON.stringify(skills[0], null, 2));
    return;
  }

  const { data, error } = await supabase
    .from("sd_skills")
    .upsert(skills, { onConflict: "slug" })
    .select("id, slug");

  if (error) {
    console.error("[seed] Upsert failed:", error);
    process.exit(1);
  }
  console.log(`[seed] Upserted ${data?.length ?? 0} skill(s).`);
}
