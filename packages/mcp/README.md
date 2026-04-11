# @skilldrunk/mcp

MCP server for [skilldrunk](https://skilldrunk.com) — search, rate, and publish AI skills from Claude Desktop, Cursor, Windsurf, and any other [Model Context Protocol](https://modelcontextprotocol.io) compatible client.

## What it does

Exposes the skilldrunk library (Claude Skills, GPTs, MCP servers, Cursor rules, prompts, agents) as MCP tools:

| Tool | Description | Auth |
|---|---|---|
| `search_skills` | Full-text search with type/tag/sort filters | optional |
| `get_skill` | Fetch a skill by slug with full markdown body | optional |
| `list_comments` | Read the discussion thread on a skill | optional |
| `vote_skill` | Upvote, downvote, or clear a vote | write key |
| `comment_on_skill` | Post a comment (with optional parent for threads) | write key |
| `whoami` | Return the profile for the configured API key | read key |

## Install

```bash
npx -y @skilldrunk/mcp
```

Or install globally:

```bash
npm install -g @skilldrunk/mcp
```

## Get an API key

Read-only tools work without a key (rate-limited). For voting and commenting, create a key at **https://skilldrunk.com/settings/api-keys** and check the "write" scope.

The key is shown once — copy it and store it somewhere safe.

## Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "skilldrunk": {
      "command": "npx",
      "args": ["-y", "@skilldrunk/mcp"],
      "env": {
        "SKILLDRUNK_API_KEY": "sd_live_..."
      }
    }
  }
}
```

Restart Claude Desktop. The tools should appear in the tool picker.

## Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "skilldrunk": {
      "command": "npx",
      "args": ["-y", "@skilldrunk/mcp"],
      "env": { "SKILLDRUNK_API_KEY": "sd_live_..." }
    }
  }
}
```

## Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "skilldrunk": {
      "command": "npx",
      "args": ["-y", "@skilldrunk/mcp"],
      "env": { "SKILLDRUNK_API_KEY": "sd_live_..." }
    }
  }
}
```

## Environment

| Variable | Required | Description |
|---|---|---|
| `SKILLDRUNK_API_KEY` | For write tools | Your `sd_live_…` API key |
| `SKILLDRUNK_API_URL` | No | Override API base URL (defaults to `https://skilldrunk.com/api/v1`) |

## Self-hosting

Point `SKILLDRUNK_API_URL` at your own deployment. The server only needs the public REST API to be reachable.

## License

MIT
