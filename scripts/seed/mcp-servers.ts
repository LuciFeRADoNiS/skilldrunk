/**
 * Import MCP servers by scraping the README of wong2/awesome-mcp-servers.
 * The README lists servers as:  `- [name](repo-url) - description`
 * We parse those lines directly instead of fetching each repo.
 */
import { ghFetch, slugify, type ImportedSkill, upsertSkills } from "./shared";

const REPO = "wong2/awesome-mcp-servers";
const BRANCH = "main";

export async function importMcpServers(): Promise<ImportedSkill[]> {
  const res = await ghFetch(
    `https://raw.githubusercontent.com/${REPO}/${BRANCH}/README.md`
  );
  const readme = await res.text();

  // Matches:
  //   - [Name](url) - description
  //   - **[Name](url)** - description
  //   * [Name](url) — description
  // The name and URL are required; trailing description is optional.
  const entryRe =
    /^[-*]\s+\**\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\**(?:\s*[-—–]\s*(.+))?$/;

  // Track current section (H2/H3 heading) as a tag.
  const lines = readme.split("\n");
  let currentSection = "";
  const out: ImportedSkill[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const heading = line.match(/^##+\s+(.+?)\s*$/);
    if (heading) {
      currentSection = heading[1]
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
      continue;
    }
    const match = line.match(entryRe);
    if (!match) continue;

    const [, name, url, desc] = match;
    const slug = slugify(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const description = (desc ?? "").replace(/\s+/g, " ").trim();

    out.push({
      slug,
      title: name,
      summary: description || `${name} — MCP server.`,
      type: "mcp_server",
      body_mdx: `# ${name}\n\n${description}\n\nSource: <${url}>\n`,
      source_url: url,
      tags: currentSection
        ? ["mcp", currentSection.slice(0, 30)]
        : ["mcp"],
      metadata: { source_list: REPO, section: currentSection },
      status: "published",
    });
  }

  console.log(`[mcp-servers] Parsed ${out.length} MCP server entries.`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importMcpServers().then(upsertSkills);
}
