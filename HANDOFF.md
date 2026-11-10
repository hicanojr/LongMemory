# HANDOFF
Updated: 2026-11-10 09:05 EST
Branch / last commit: main 0d14edc (fix also on branch fix/mcp-fast-startup)

## Goal right now
Make the `longmemory` MCP server start fast enough for Claude's Cowork and Code
sessions, which were failing with "Couldn't start ... Request timed out".

## Done this session
- Diagnosed: cold start took 26-54s because the store loads, indexes and integrity-checks
  the whole 490 MB `.longmemory/project.db` before the MCP handshake. Not a lock problem.
- Fixed (commit 0d14edc): memory store is created lazily; stdio transport warms it up
  2s after `notifications/initialized`. Handshake + list calls now answer in ~1.6s.
- Fast-forwarded local `main` to the fix (main is 1 ahead of origin/main).
- Saved patch + git bundle to ~/OneDrive/OpenMemory-fixes/.

## State
- Tests: no unit-test suite. `tsc --noEmit` passes; `bench:core`-style smoke run passes gates.
- Known problems:
  - Not on GitHub. `origin` is CaviraOSS/LongMemory (read-only for hicanojr); creating a
    public fork was blocked by auto mode and needs the user's go-ahead.
  - A `longmemory_recall` on this DB takes ~70-80s of work (pre-existing).
  - Server exits with code 13 ("unsettled top-level await") when stdin closes (pre-existing).
  - Claude must be quit and reopened to pick up the fix.

## Next steps (priority order)
1. Restart Claude; confirm ~/Library/Logs/Claude/mcp-server-longmemory.log has no
   "Couldn't start for Cowork and Code sessions" error.
2. If the user approves: fork to hicanojr, push main + fix/mcp-fast-startup, optionally open a PR upstream.
3. Optional: investigate slow recall (profile `create_memory` / recall path).

## Key files
- src/mcp/runtime.ts: lazy `memory` getter, `warm_up()`, `close()` skips unloaded store.
- src/mcp/transports/stdio.ts: background warm-up after initialize.
- ~/Library/Application Support/Claude/claude_desktop_config.json: `longmemory` server entry.

## Decisions and constraints
- Lazy getter instead of async init: every caller already uses `runtime.memory` inside handlers.
- package-lock.json is untracked on purpose (repo uses pnpm); left out of commits.

## Do not
- Read docs/handoff-archive/ unless the user asks.
- Push to origin (upstream, no write access).
