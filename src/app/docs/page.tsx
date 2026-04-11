import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs — skilldrunk",
  description:
    "Developer documentation for skilldrunk — REST API reference and MCP server setup.",
};

export default function DocsHomePage() {
  return (
    <>
      <h1>skilldrunk developer docs</h1>
      <p>
        skilldrunk is the community library for AI skills — Claude Skills, GPTs, MCP
        servers, Cursor rules, prompts, and agents. You can search and contribute
        from your browser, or drive the whole thing programmatically.
      </p>

      <h2>Two ways to integrate</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 not-prose">
        <Link
          href="/docs/api"
          className="block rounded-lg border p-6 transition hover:border-orange-500"
        >
          <h3 className="mb-2 text-lg font-semibold">REST API →</h3>
          <p className="text-sm text-muted-foreground">
            Plain HTTP + JSON. Works from any language. Public reads are free;
            writes (vote, comment) need an API key.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            https://skilldrunk.com/api/v1
          </p>
        </Link>

        <Link
          href="/docs/mcp"
          className="block rounded-lg border p-6 transition hover:border-orange-500"
        >
          <h3 className="mb-2 text-lg font-semibold">MCP server →</h3>
          <p className="text-sm text-muted-foreground">
            Drop skilldrunk into Claude Desktop, Cursor, or Windsurf as tools
            your agent can call directly.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            npx -y @skilldrunk/mcp
          </p>
        </Link>
      </div>

      <h2>Get an API key</h2>
      <p>
        Head to{" "}
        <Link href="/settings/api-keys" className="underline">
          Settings → API keys
        </Link>
        , click <em>Create a new key</em>, and pick the scopes you need:
      </p>
      <ul>
        <li>
          <strong>read</strong> — list skills, read details and comments. Default.
        </li>
        <li>
          <strong>write</strong> — vote, post comments, publish skills on behalf of
          your account.
        </li>
      </ul>
      <p>
        Keys are shown exactly once at creation time. Store yours somewhere safe — we
        only keep a SHA-256 hash, so if you lose it you&apos;ll need to create a new one.
      </p>

      <h2>Rate limits</h2>
      <p>
        Every response includes <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>
        {" "}and <code>X-RateLimit-Reset</code> headers. Current limits per minute:
      </p>
      <ul>
        <li>Anonymous reads: <strong>60/min</strong></li>
        <li>Authenticated reads: <strong>300/min</strong></li>
        <li>Authenticated writes: <strong>60/min</strong></li>
      </ul>
      <p>
        Hit the ceiling and you&apos;ll get <code>429 rate_limited</code> with a
        {" "}<code>Retry-After</code> header. Be kind.
      </p>
    </>
  );
}
