/**
 * Import Claude Skills from anthropics/skills.
 */
import matter from "gray-matter";
import { ghFetch, slugify, type ImportedSkill, upsertSkills } from "./shared";

const REPO = "anthropics/skills";
const BRANCH = "main";

type GhTreeItem = { path: string; type: "blob" | "tree"; sha: string };

export async function importClaudeSkills(): Promise<ImportedSkill[]> {
  const treeRes = await ghFetch(
    `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`
  );
  const tree = (await treeRes.json()) as { tree: GhTreeItem[] };
  const files = tree.tree.filter(
    (t) => t.type === "blob" && /SKILL\.md$/i.test(t.path)
  );
  console.log(`[claude-skills] Found ${files.length} SKILL.md files.`);

  const out: ImportedSkill[] = [];
  for (const f of files) {
    try {
      const raw = await ghFetch(
        `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${f.path}`
      );
      const content = await raw.text();
      const parsed = matter(content);
      const fm = parsed.data as Record<string, unknown>;
      const name =
        (fm.name as string) ??
        (fm.title as string) ??
        f.path.replace(/\/SKILL\.md$/i, "").split("/").pop() ??
        "skill";
      const description =
        (fm.description as string) ??
        parsed.content.slice(0, 200).replace(/\s+/g, " ").trim();
      out.push({
        slug: slugify(name),
        title: name,
        summary: description.slice(0, 500),
        type: "claude_skill",
        body_mdx: parsed.content.trim(),
        source_url: `https://github.com/${REPO}/blob/${BRANCH}/${f.path}`,
        tags: Array.isArray(fm.tags)
          ? (fm.tags as string[]).map(String)
          : typeof fm.tags === "string"
            ? (fm.tags as string).split(",").map((t) => t.trim())
            : [],
        metadata: { source_repo: REPO, source_path: f.path, frontmatter: fm },
        status: "published",
      });
    } catch (err) {
      console.warn(`[claude-skills] Skipped ${f.path}:`, (err as Error).message);
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importClaudeSkills().then(upsertSkills);
}
