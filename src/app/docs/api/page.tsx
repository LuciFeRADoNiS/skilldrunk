import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "REST API — skilldrunk docs",
  description: "REST API reference for the skilldrunk public v1 API.",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiDocsPage() {
  return (
    <>
      <h1>REST API reference</h1>
      <p>
        Base URL: <code>https://skilldrunk.com/api/v1</code>
      </p>

      <h2>Authentication</h2>
      <p>
        Send your API key in the <code>Authorization</code> header:
      </p>
      <Code>{`Authorization: Bearer sd_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
      <p>
        Create a key at{" "}
        <Link href="/settings/api-keys" className="underline">
          /settings/api-keys
        </Link>
        . Read endpoints work without a key but at a lower rate limit. Write endpoints
        (vote, comment) require a key with the <code>write</code> scope.
      </p>

      <h2>Response envelope</h2>
      <p>Success responses:</p>
      <Code>{`{ "data": <payload>, "meta": { ... } }`}</Code>
      <p>Errors:</p>
      <Code>{`{ "error": { "code": "not_found", "message": "The requested skill was not found." } }`}</Code>
      <p>Error codes you&apos;ll see in the wild:</p>
      <ul>
        <li><code>unauthorized</code> — missing or invalid API key (401)</li>
        <li><code>forbidden</code> — key lacks the required scope (403)</li>
        <li><code>not_found</code> — 404</li>
        <li><code>bad_request</code> — validation failed (400)</li>
        <li><code>rate_limited</code> — 429; check <code>Retry-After</code></li>
        <li><code>internal_error</code> — 500</li>
      </ul>

      <h2>Endpoints</h2>

      <h3>
        <code>GET /skills</code>
      </h3>
      <p>List / search skills.</p>
      <p>Query parameters:</p>
      <ul>
        <li><code>q</code> — full-text search query</li>
        <li><code>type</code> — one of <code>claude_skill</code>, <code>gpt</code>, <code>mcp_server</code>, <code>cursor_rule</code>, <code>prompt</code>, <code>agent</code></li>
        <li><code>tag</code> — filter by tag (repeatable; AND semantics)</li>
        <li><code>sort</code> — <code>trending</code> (default) | <code>new</code> | <code>top</code></li>
        <li><code>limit</code> — 1–100 (default 20)</li>
        <li><code>cursor</code> — opaque cursor from a previous response&apos;s <code>meta.next_cursor</code></li>
      </ul>
      <Code>{`curl "https://skilldrunk.com/api/v1/skills?q=pdf&type=claude_skill&limit=5"`}</Code>

      <h3>
        <code>GET /skills/:slug</code>
      </h3>
      <p>Fetch a single skill with its full markdown body.</p>
      <Code>{`curl "https://skilldrunk.com/api/v1/skills/pdf-skill"`}</Code>

      <h3>
        <code>GET /skills/:slug/comments</code>
      </h3>
      <p>List the discussion thread (up to 200 comments).</p>

      <h3>
        <code>POST /skills/:slug/vote</code>
      </h3>
      <p>Cast or clear a vote. Requires <code>write</code> scope.</p>
      <Code>{`curl -X POST "https://skilldrunk.com/api/v1/skills/pdf-skill/vote" \\
  -H "Authorization: Bearer $SKILLDRUNK_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"value": 1}'`}</Code>
      <p>
        Body: <code>{`{ "value": 1 | -1 | 0 }`}</code> — <code>0</code> clears any existing vote.
      </p>

      <h3>
        <code>POST /skills/:slug/comments</code>
      </h3>
      <p>Post a comment (or a threaded reply). Requires <code>write</code> scope.</p>
      <Code>{`curl -X POST "https://skilldrunk.com/api/v1/skills/pdf-skill/comments" \\
  -H "Authorization: Bearer $SKILLDRUNK_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"body_md": "This saved me 3 hours. Thanks!"}'`}</Code>
      <p>Include <code>parent_id</code> (UUID of another comment) to reply in a thread.</p>

      <h3>
        <code>GET /me</code>
      </h3>
      <p>Return the profile + scopes for the authenticated API key. Handy for verifying a key is valid.</p>

      <h2>Language examples</h2>

      <h3>JavaScript / TypeScript</h3>
      <Code>{`const res = await fetch("https://skilldrunk.com/api/v1/skills?q=pdf", {
  headers: { Authorization: \`Bearer \${process.env.SKILLDRUNK_KEY}\` },
});
const { data } = await res.json();
console.log(data.length, "skills matched");`}</Code>

      <h3>Python</h3>
      <Code>{`import os, requests

r = requests.get(
    "https://skilldrunk.com/api/v1/skills",
    params={"q": "pdf", "type": "claude_skill"},
    headers={"Authorization": f"Bearer {os.environ['SKILLDRUNK_KEY']}"}
)
r.raise_for_status()
print(r.json()["data"])`}</Code>

      <h2>Versioning</h2>
      <p>
        We&apos;re on <code>v1</code>. Breaking changes will ship as <code>v2</code>, and <code>v1</code> will
        be supported for at least 12 months after <code>v2</code> stabilises. Additive changes
        (new fields, new endpoints) can land in <code>v1</code> at any time.
      </p>
    </>
  );
}
