import { NextRequest, NextResponse } from "next/server";

/**
 * skilldrunk MCP server — HTTP transport.
 *
 * Implements the MCP Streamable HTTP protocol (JSON-RPC 2.0 over POST).
 * Companion to packages/mcp (stdio). Same 6 tools, thin proxy to /api/v1.
 *
 * Smithery + Claude can add this as an MCP server:
 *   URL: https://skilldrunk.com/api/mcp
 *   Auth (optional): Authorization: Bearer sd_live_xxx
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VERSION = "0.2.0";
const PROTOCOL_VERSION = "2025-03-26";
const API_URL = "https://skilldrunk.com/api/v1";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

const TOOLS = [
  {
    name: "search_skills",
    description:
      "Search the skilldrunk library for AI skills (Claude Skills, Custom GPTs, MCP servers, Cursor rules, prompts, agents). Returns a ranked list with titles, summaries, types, tags and vote counts.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Full-text search query" },
        type: {
          type: "string",
          enum: ["claude_skill", "gpt", "mcp_server", "cursor_rule", "prompt", "agent"],
        },
        tag: { type: "array", items: { type: "string" } },
        sort: {
          type: "string",
          enum: ["trending", "new", "top"],
          default: "trending",
        },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: "get_skill",
    description:
      "Fetch a single skill by slug with full markdown body and metadata. Use after search_skills to get install details.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: { type: "string" } },
    },
  },
  {
    name: "list_comments",
    description:
      "List the discussion thread for a skill (up to 200 comments, threaded).",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: { type: "string" } },
    },
  },
  {
    name: "vote_skill",
    description:
      "Cast or clear a vote on a skill. Requires auth: pass `Authorization: Bearer sd_live_xxx`.",
    inputSchema: {
      type: "object",
      required: ["slug", "value"],
      properties: {
        slug: { type: "string" },
        value: { type: "integer", enum: [-1, 0, 1] },
      },
    },
  },
  {
    name: "comment_on_skill",
    description:
      "Post a comment on a skill. Requires auth. Returns the created comment.",
    inputSchema: {
      type: "object",
      required: ["slug", "body_md"],
      properties: {
        slug: { type: "string" },
        body_md: { type: "string", maxLength: 10000 },
        parent_id: { type: "string" },
      },
    },
  },
  {
    name: "whoami",
    description:
      "Return the profile and scopes of the caller's API key. Useful to verify auth.",
    inputSchema: { type: "object", properties: {} },
  },
];

function makeResponse(
  id: string | number | null,
  result?: unknown,
  error?: JsonRpcResponse["error"],
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, ...(error ? { error } : { result }) };
}

async function apiProxy(
  path: string,
  init: RequestInit & { auth: string | null },
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": `skilldrunk-mcp-http/${VERSION}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.auth) headers["Authorization"] = init.auth;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = (parsed as { error?: { code?: string; message?: string } } | null)?.error;
    throw new Error(
      err ? `${err.code ?? "api_error"}: ${err.message ?? "failed"}` : `HTTP ${res.status}`,
    );
  }
  return (parsed as { data: unknown } | null)?.data;
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
  auth: string | null,
): Promise<unknown> {
  switch (name) {
    case "search_skills": {
      const params = new URLSearchParams();
      if (args.q) params.set("q", String(args.q));
      if (args.type) params.set("type", String(args.type));
      if (args.sort) params.set("sort", String(args.sort));
      if (args.limit) params.set("limit", String(args.limit));
      const tags = Array.isArray(args.tag) ? (args.tag as string[]) : [];
      for (const t of tags) params.append("tag", t);
      return apiProxy(`/skills?${params.toString()}`, { auth });
    }
    case "get_skill":
      return apiProxy(`/skills/${encodeURIComponent(String(args.slug))}`, { auth });
    case "list_comments":
      return apiProxy(
        `/skills/${encodeURIComponent(String(args.slug))}/comments`,
        { auth },
      );
    case "vote_skill":
      if (!auth) throw new Error("auth_required: Bearer token needed for vote_skill");
      return apiProxy(
        `/skills/${encodeURIComponent(String(args.slug))}/vote`,
        {
          method: "POST",
          body: JSON.stringify({ value: args.value }),
          auth,
        },
      );
    case "comment_on_skill":
      if (!auth) throw new Error("auth_required: Bearer token needed for comment_on_skill");
      return apiProxy(
        `/skills/${encodeURIComponent(String(args.slug))}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            body_md: args.body_md,
            parent_id: args.parent_id ?? null,
          }),
          auth,
        },
      );
    case "whoami":
      if (!auth) throw new Error("auth_required: Bearer token needed for whoami");
      return apiProxy(`/me`, { auth });
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

async function handleRpc(
  req: JsonRpcRequest,
  auth: string | null,
): Promise<JsonRpcResponse> {
  const id = req.id ?? null;
  try {
    switch (req.method) {
      case "initialize":
        return makeResponse(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "skilldrunk", version: VERSION },
        });
      case "notifications/initialized":
      case "notifications/cancelled":
        // Notifications expect no response; return empty result for client compat
        return makeResponse(id, {});
      case "tools/list":
        return makeResponse(id, { tools: TOOLS });
      case "tools/call": {
        const { name, arguments: args } = (req.params ?? {}) as {
          name: string;
          arguments?: Record<string, unknown>;
        };
        try {
          const data = await callTool(name, args ?? {}, auth);
          return makeResponse(id, {
            content: [
              { type: "text", text: JSON.stringify(data, null, 2) },
            ],
          });
        } catch (err) {
          return makeResponse(id, {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          });
        }
      }
      case "ping":
        return makeResponse(id, {});
      default:
        return makeResponse(id, undefined, {
          code: -32601,
          message: `Method not found: ${req.method}`,
        });
    }
  } catch (err) {
    return makeResponse(id, undefined, {
      code: -32603,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      makeResponse(null, undefined, { code: -32700, message: "Parse error" }),
      { status: 400 },
    );
  }

  // Batch support
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      (body as JsonRpcRequest[]).map((r) => handleRpc(r, auth)),
    );
    return NextResponse.json(responses);
  }

  const response = await handleRpc(body as JsonRpcRequest, auth);
  return NextResponse.json(response, {
    // Hint Smithery/clients that this endpoint speaks MCP
    headers: { "x-mcp-server": `skilldrunk/${VERSION}` },
  });
}

/** Discovery — GET returns a tiny human/machine-readable manifest. */
export async function GET() {
  return NextResponse.json(
    {
      name: "skilldrunk",
      version: VERSION,
      protocol: "mcp",
      protocolVersion: PROTOCOL_VERSION,
      transport: "http",
      description:
        "skilldrunk.com — the library for AI skills. Search, read, vote and comment on Claude Skills, MCP servers, GPTs, Cursor rules and prompts.",
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      docs: "https://skilldrunk.com/docs/mcp",
      endpoint: "https://skilldrunk.com/api/mcp",
    },
    { headers: { "x-mcp-server": `skilldrunk/${VERSION}` } },
  );
}
