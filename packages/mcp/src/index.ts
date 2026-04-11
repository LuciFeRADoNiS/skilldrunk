#!/usr/bin/env node
/**
 * skilldrunk MCP server
 *
 * Exposes the public skilldrunk REST API as MCP tools so Claude Desktop,
 * Cursor, Windsurf and any other MCP-compatible client can search, read,
 * vote on and comment on AI skills in the skilldrunk library.
 *
 * Config (via environment variables):
 *   SKILLDRUNK_API_KEY    — required for write tools (vote, comment).
 *                           Optional for reads, but gives a higher rate limit.
 *   SKILLDRUNK_API_URL    — override for self-hosting; defaults to
 *                           https://skilldrunk.com/api/v1
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const API_URL =
  process.env.SKILLDRUNK_API_URL?.replace(/\/$/, "") ?? "https://skilldrunk.com/api/v1";
const API_KEY = process.env.SKILLDRUNK_API_KEY ?? null;

const VERSION = "0.1.0";

type ApiSuccess<T> = { data: T; meta?: Record<string, unknown> };
type ApiFail = { error: { code: string; message: string; details?: unknown } };

async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: "optional" | "required" } = {}
): Promise<T> {
  const { auth = "optional", headers, ...rest } = init;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": `skilldrunk-mcp/${VERSION}`,
    ...(headers as Record<string, string> | undefined),
  };
  if (API_KEY) {
    finalHeaders["Authorization"] = `Bearer ${API_KEY}`;
  } else if (auth === "required") {
    throw new Error(
      "This tool requires a skilldrunk API key. Set SKILLDRUNK_API_KEY in your MCP client config. Get one at https://skilldrunk.com/settings/api-keys"
    );
  }

  const url = `${API_URL}${path}`;
  const res = await fetch(url, { ...rest, headers: finalHeaders });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API ${res.status}: non-JSON response: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = (parsed as ApiFail | null)?.error;
    throw new Error(
      err ? `${err.code}: ${err.message}` : `API ${res.status}: ${text.slice(0, 200)}`
    );
  }
  return (parsed as ApiSuccess<T>).data;
}

// ---------- Tool schemas ----------

const searchSkillsSchema = z.object({
  q: z.string().optional().describe("Full-text search query, e.g. 'pdf extraction'"),
  type: z
    .enum(["claude_skill", "gpt", "mcp_server", "cursor_rule", "prompt", "agent"])
    .optional()
    .describe("Filter by skill type"),
  tag: z
    .array(z.string())
    .optional()
    .describe("Filter by tag(s) — skill must have all of the given tags"),
  sort: z.enum(["trending", "new", "top"]).optional().default("trending"),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const getSkillSchema = z.object({
  slug: z.string().describe("Slug of the skill, e.g. 'pdf-skill'"),
});

const voteSkillSchema = z.object({
  slug: z.string(),
  value: z
    .number()
    .int()
    .refine((v) => v === 1 || v === -1 || v === 0, {
      message: "value must be 1, -1, or 0 (0 clears)",
    })
    .describe("1 = upvote, -1 = downvote, 0 = clear existing vote"),
});

const commentSkillSchema = z.object({
  slug: z.string(),
  body_md: z.string().min(1).max(10_000).describe("Markdown body of the comment"),
  parent_id: z
    .string()
    .uuid()
    .optional()
    .describe("Optional parent comment UUID for threaded replies"),
});

const listCommentsSchema = z.object({
  slug: z.string(),
});

// ---------- Server ----------

const server = new Server(
  {
    name: "skilldrunk",
    version: VERSION,
  },
  {
    capabilities: { tools: {} },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_skills",
      description:
        "Search the skilldrunk library for AI skills (Claude Skills, GPTs, MCP servers, Cursor rules, prompts, agents). Returns a ranked list of matching skills with titles, summaries, types, tags and vote counts.",
      inputSchema: {
        type: "object",
        properties: {
          q: { type: "string", description: "Full-text search query" },
          type: {
            type: "string",
            enum: ["claude_skill", "gpt", "mcp_server", "cursor_rule", "prompt", "agent"],
          },
          tag: { type: "array", items: { type: "string" } },
          sort: { type: "string", enum: ["trending", "new", "top"], default: "trending" },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    {
      name: "get_skill",
      description:
        "Fetch a single skill by slug, including the full markdown body and all metadata. Use this after search_skills when you need the details to install or use a skill.",
      inputSchema: {
        type: "object",
        required: ["slug"],
        properties: {
          slug: { type: "string" },
        },
      },
    },
    {
      name: "list_comments",
      description: "List the discussion thread for a skill (up to 200 comments).",
      inputSchema: {
        type: "object",
        required: ["slug"],
        properties: {
          slug: { type: "string" },
        },
      },
    },
    {
      name: "vote_skill",
      description:
        "Cast or clear a vote on a skill. Requires an API key with the 'write' scope set in SKILLDRUNK_API_KEY.",
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
        "Post a comment on a skill. Requires an API key with the 'write' scope. Returns the created comment.",
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
        "Return the profile and scopes of the API key currently configured in SKILLDRUNK_API_KEY. Use this to verify your key is valid.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    switch (name) {
      case "search_skills": {
        const parsed = searchSkillsSchema.parse(args ?? {});
        const params = new URLSearchParams();
        if (parsed.q) params.set("q", parsed.q);
        if (parsed.type) params.set("type", parsed.type);
        if (parsed.sort) params.set("sort", parsed.sort);
        if (parsed.limit) params.set("limit", String(parsed.limit));
        for (const tag of parsed.tag ?? []) params.append("tag", tag);
        const data = await apiFetch<unknown[]>(`/skills?${params.toString()}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      case "get_skill": {
        const parsed = getSkillSchema.parse(args ?? {});
        const data = await apiFetch<unknown>(
          `/skills/${encodeURIComponent(parsed.slug)}`
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      case "list_comments": {
        const parsed = listCommentsSchema.parse(args ?? {});
        const data = await apiFetch<unknown>(
          `/skills/${encodeURIComponent(parsed.slug)}/comments`
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      case "vote_skill": {
        const parsed = voteSkillSchema.parse(args ?? {});
        const data = await apiFetch<unknown>(
          `/skills/${encodeURIComponent(parsed.slug)}/vote`,
          {
            method: "POST",
            body: JSON.stringify({ value: parsed.value }),
            auth: "required",
          }
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      case "comment_on_skill": {
        const parsed = commentSkillSchema.parse(args ?? {});
        const data = await apiFetch<unknown>(
          `/skills/${encodeURIComponent(parsed.slug)}/comments`,
          {
            method: "POST",
            body: JSON.stringify({
              body_md: parsed.body_md,
              parent_id: parsed.parent_id ?? null,
            }),
            auth: "required",
          }
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      case "whoami": {
        const data = await apiFetch<unknown>(`/me`, { auth: "required" });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers must not write to stdout (it's the protocol channel). stderr
  // is fine for banner output.
  console.error(`skilldrunk-mcp v${VERSION} ready — ${API_URL}`);
}

main().catch((err) => {
  console.error("skilldrunk-mcp fatal:", err);
  process.exit(1);
});
