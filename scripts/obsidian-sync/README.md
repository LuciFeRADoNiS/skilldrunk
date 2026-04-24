# @skilldrunk/obsidian-sync

Obsidian vault → analiz.skilldrunk.com event log.

Two modes:
- **`backfill.mjs`** — one-shot scan of the vault, emits a `create` event per file
- **`watch.mjs`** — long-running watcher, emits events on create/modify/delete

Both use the same `az_events` table with idempotent `external_id` (re-runs
are safe; duplicates are silently skipped).

## Setup

```bash
cd scripts/obsidian-sync
pnpm install
```

Env comes from `../../.env.local` (repo root):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Backfill (run once)

```bash
pnpm backfill
```

Scans `/Users/ozgurgur/Documents/Personal Brain/` recursively. Frontmatter
`date:` (or `YYYY-MM-DD` filename prefix) is used as `occurred_at`; otherwise
falls back to file mtime. The first 500 chars of note body become the event
body.

## Watch (background)

```bash
pnpm watch
```

Runs until killed. Modify events are debounced per-file (2 min window) to
avoid spam from editor auto-save.

### Run as macOS background service

```bash
# Install
cp com.skilldrunk.obsidian-sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.skilldrunk.obsidian-sync.plist

# Check it's running
launchctl list | grep skilldrunk

# Stop
launchctl unload ~/Library/LaunchAgents/com.skilldrunk.obsidian-sync.plist

# Logs
tail -f /tmp/skilldrunk-obsidian-sync.out.log
tail -f /tmp/skilldrunk-obsidian-sync.err.log
```

The plist reads env from `EnvironmentVariables` which doesn't include Supabase
creds — for launchd use, hard-code them there OR source them from a shell
wrapper. See note in plist.

## Ignored folders

`.obsidian`, `.trash`, `_attachments`, `Claude-Memory`, `Scripts`, `Templates`,
and any folder starting with `.`

## Event kinds emitted

`{folder_kind}:{op}` where `op ∈ {create, modify, delete}`.

| Folder | kind |
|---|---|
| Meetings/ | meeting |
| Daily/ | daily_note |
| Projects/ | project_note |
| Knowledge/ | knowledge |
| AI-Sessions/ | ai_session |
| Decisions/ | decision |
| People/ | person |
| Companies/ | company |
| Research/ | research |
| Inbox/ | inbox |
| Topics/ | topic |
| Link-Analyses/ | link_analysis |
| (other) | note |
