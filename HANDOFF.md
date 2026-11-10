# HANDOFF
Updated: 2026-11-10 09:05 EST
Branch / last commit: main e545fbc = fix (rebased on upstream aec98ce); branch fix/mcp-fast-startup 0d14edc

## Goal right now
Make the `longmemory` MCP server start fast enough for Claude's Cowork and Code
sessions, which were failing with "Couldn't start ... Request timed out".

## Done this session
- Diagnosed: cold start took 26-54s because the store loads, indexes and integrity-checks
  the whole 490 MB `.longmemory/project.db` before the MCP handshake. Not a lock problem.
- Fixed (commit 0d14edc): memory store is created lazily; stdio transport warms it up
  2s after `notifications/initialized`. Handshake + list calls now answer in ~1.6s.
- Forked to https://github.com/hicanojr/LongMemory (remote `fork`, public). Local `main`
  was rebased onto the fork's newer main (3 upstream commits) and pushed; `main` tracks fork/main.
  Branch fix/mcp-fast-startup also pushed (based on the older 8badf44).
- Saved patch + git bundle to ~/OneDrive/OpenMemory-fixes/.

## State
- Tests: no unit-test suite. `tsc --noEmit` passes; `bench:core`-style smoke run passes gates.
- Known problems:
  - `origin` is upstream CaviraOSS/LongMemory (read-only for hicanojr); push to `fork`.
  - A `longmemory_recall` on this DB takes ~70-80s of work (pre-existing).
  - Server exits with code 13 ("unsettled top-level await") when stdin closes (pre-existing).
  - Claude must be quit and reopened to pick up the fix.

## Next steps (priority order)
1. Restart Claude; confirm ~/Library/Logs/Claude/mcp-server-longmemory.log has no
   "Couldn't start for Cowork and Code sessions" error.
2. Optional, only with the user's OK: open a PR upstream from hicanojr:fix/mcp-fast-startup.
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
