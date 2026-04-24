import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MCP server — skilldrunk docs",
  description:
    "Install and configure the skilldrunk MCP server in Claude Desktop, Cursor, and Windsurf.",
};

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100">
      {lang && <span className="mb-2 block text-[10px] uppercase text-zinc-500">{lang}</span>}
      <code>{children}</code>
    </pre>
  );
}

export default function McpDocsPage() {
  return (
    <>
      <h1>MCP server</h1>
      <p>
        <code>@skilldrunk/mcp</code> is an{" "}
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">
          MCP
        </a>{" "}
        server that lets AI clients (Claude Desktop, Cursor, Windsurf, anything that
        speaks MCP) search and interact with the skilldrunk library as native tools.
      </p>

      <h2>Tools it exposes</h2>
      <ul>
        <li>
          <code>search_skills</code> — full-text search with type / tag / sort filters
        </li>
        <li>
          <code>get_skill</code> — fetch a skill by slug with its full markdown body
        </li>
        <li>
          <code>list_comments</code> — read the discussion thread on a skill
        </li>
        <li>
          <code>vote_skill</code> — upvote, downvote, or clear a vote <em>(write key)</em>
        </li>
        <li>
          <code>comment_on_skill</code> — post a comment or threaded reply <em>(write key)</em>
        </li>
        <li>
          <code>whoami</code> — verify your API key
        </li>
      </ul>

      <h2>Prerequisites</h2>
      <ul>
        <li>Node.js 18.17 or later</li>
        <li>
          An API key from{" "}
          <Link href="/settings/api-keys" className="underline">
            /settings/api-keys
          </Link>{" "}
          — optional for reads, required for <code>vote_skill</code> /{" "}
          <code>comment_on_skill</code>
        </li>
      </ul>

      <h2>Two transports</h2>
      <p>
        The server speaks both <strong>stdio</strong> (npm package, for
        locally-running clients) and <strong>Streamable HTTP</strong> (remote,
        for Smithery, Claude web, hosted clients).
      </p>
      <h3>HTTP endpoint</h3>
      <p>
        Point any Streamable-HTTP MCP client at{" "}
        <code>https://skilldrunk.com/api/mcp</code>. Optional auth:{" "}
        <code>Authorization: Bearer sd_live_...</code>.
      </p>
      <Code lang="bash">{`curl -sS https://skilldrunk.com/api/mcp \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</Code>

      <h2>Claude Desktop (stdio)</h2>
      <p>
        Edit <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>{" "}
        (macOS) or <code>%APPDATA%\Claude\claude_desktop_config.json</code> (Windows):
      </p>
      <Code lang="json">{`{
  "mcpServers": {
    "skilldrunk": {
      "command": "npx",
      "args": ["-y", "@skilldrunk/mcp"],
      "env": {
        "SKILLDRUNK_API_KEY": "sd_live_..."
      }
    }
  }
}`}</Code>
      <p>Restart Claude Desktop. The six tools should appear in the tool picker.</p>

      <h2>Cursor</h2>
      <p>
        Edit <code>~/.cursor/mcp.json</code>:
      </p>
      <Code lang="json">{`{
  "mcpServers": {
    "skilldrunk": {
      "command": "npx",
      "args": ["-y", "@skilldrunk/mcp"],
      "env": { "SKILLDRUNK_API_KEY": "sd_live_..." }
    }
  }
}`}</Code>

      <h2>Windsurf</h2>
      <p>
        Edit <code>~/.codeium/windsurf/mcp_config.json</code>:
      </p>
      <Code lang="json">{`{
  "mcpServers": {
    "skilldrunk": {
      "command": "npx",
      "args": ["-y", "@skilldrunk/mcp"],
      "env": { "SKILLDRUNK_API_KEY": "sd_live_..." }
    }
  }
}`}</Code>

      <h2>Environment variables</h2>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Variable</th>
            <th className="text-left">Required</th>
            <th className="text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>SKILLDRUNK_API_KEY</code>
            </td>
            <td>For write tools</td>
            <td>Your <code>sd_live_…</code> API key</td>
          </tr>
          <tr>
            <td>
              <code>SKILLDRUNK_API_URL</code>
            </td>
            <td>No</td>
            <td>
              Override the API base URL. Defaults to{" "}
              <code>https://skilldrunk.com/api/v1</code>.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Usage examples</h2>
      <p>Once installed, you can just ask your AI client things like:</p>
      <blockquote>
        <p>“Search skilldrunk for the top MCP servers tagged <code>finance</code>.”</p>
        <p>“Find a Claude Skill for parsing PDFs and show me the install instructions.”</p>
        <p>“Upvote <code>pdf-skill</code> on skilldrunk.”</p>
        <p>
          “Leave a comment on <code>pdf-skill</code> saying this saved me three hours.”
        </p>
      </blockquote>
      <p>The client will pick the right tool automatically.</p>

      <h2>Troubleshooting</h2>
      <ul>
        <li>
          <strong>Tools don&apos;t appear</strong> — restart the client after editing the
          config. Double-check the JSON is valid.
        </li>
        <li>
          <strong>“invalid api key” errors</strong> — confirm <code>SKILLDRUNK_API_KEY</code>
          {" "}is set in <code>env</code> (not just in your shell) and hasn&apos;t been revoked.
        </li>
        <li>
          <strong>Writes failing with 403</strong> — your key is missing the{" "}
          <code>write</code> scope. Create a new key with write enabled.
        </li>
      </ul>

      <h2>Self-hosting</h2>
      <p>
        Point <code>SKILLDRUNK_API_URL</code> at your own skilldrunk deployment. The
        MCP server only uses the public REST API — no direct DB access.
      </p>

      <h2>Source + issues</h2>
      <p>
        Source at{" "}
        <a
          href="https://github.com/LuciFeRADoNiS/skilldrunk/tree/main/packages/mcp"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/LuciFeRADoNiS/skilldrunk
        </a>
        . File bugs or requests on the same repo.
      </p>
    </>
  );
}
