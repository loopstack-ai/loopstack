# Issue: `loopstack run` live-follow drops sub-workflow messages on fast runs

**Status:** open · **Area:** `@loopstack/cli` (`src/run/follow.ts`, `src/commands/run.ts`) · **Severity:** low (cosmetic; data is intact)

## Summary

During a **live** `loopstack run <workflow>`, messages/documents produced by **nested sub-workflows**
(`show: 'inline'`) are sometimes **not streamed** — the terminal shows only the sub-workflow _link_
(`⧉ <label>: <url>`) and the top-level result, skipping the nested transcript. The data is persisted
correctly: `loopstack runs <id>` (and Studio) show the full nested, depth-railed transcript. So this is
a **live-follow rendering race**, not a data or workflow bug.

## Symptom (observed)

Running `loopstack run engineer --arg prompt="Create hello.txt containing 'hi', then say done"`
(loopstack-engineer: Engineer → Claude Code Sandbox → Claude Code Session):

**Live `loopstack run` output** — nested transcript missing:

```
▸ running
✓ running (13ms)
⧉ Claude Code Sandbox: http://localhost:5173/workflows/227954b6-…
assistant:
✅ Completed
Done.
2 turns · $0.0442 · 2.6k in / 92 out · 59.5k cache · 3.4s
… (result fields)
■ run completed in 6.8s
```

**`loopstack runs <same-id>` afterwards** — full transcript present:

```
engineer #22 — completed
✓ running (6.7s)
⧉ Claude Code Sandbox
│ system: 🐳 Provisioned agent container … at http://localhost:63893
│ ⧉ Claude Code session
│ │ ⚒ Write {"content":"hi","file_path":"/workspace/hello.txt"}
│ │   → File created successfully at: /workspace/hello.txt
│ │ assistant: Done.
│ │ assistant: ✅ Completed / Done. / 2 turns · $0.0442 · …
│ system: 🧹 Container removed.
assistant: ✅ Completed / Done. / footer
```

The live view dropped everything under `⧉ Claude Code Sandbox` (its `system` lines and the entire
`│ │` session transcript). It reproduces on **fast / heavily-cached** runs (here the session was ~3.4s
with 59.5k cache-read tokens).

## Root cause (hypothesis)

`src/run/follow.ts` renders sub-workflow documents inline, railed by depth, but only for workflows it
has already discovered in its **family** map and marked **visible**:

- `const family = new Map<string, number>([[workflowId, 0]]);` — root at depth 0 (~line 121).
- A sub-workflow is added to `family` only when an event carrying its `parentId` arrives:
  `if ('parentId' in event && … && !family.has(event.workflowId)) family.set(event.workflowId, parentDepth + 1)` (~line 130).
- Events for an unknown workflow are **dropped**: `if (!family.has(event.workflowId)) return undefined;` (~line 135).
- Document/token events for `depth > 0` are further gated on **`visibleWorkflowIds`**
  (~lines 143–149, 159–161), a set that `src/commands/run.ts` (~lines 92–104) hands to both the renderer
  and `followRun`; the document renderer populates it from **link documents** (`⧉ …`).

**The race:** on a fast run, a sub-workflow emits its document events in a burst that can arrive
**before** (a) any event carrying that sub-workflow's `parentId` has registered it in `family`, and/or
(b) its link document has added it to `visibleWorkflowIds`. Those early events hit the
`!family.has(...)` / `!visibleWorkflowIds.has(...)` guards and are silently dropped. On slower runs the
ordering usually resolves in time, so the transcript appears.

## Proposed fix directions

1. **Buffer-and-flush:** when a document/message event references an unknown `workflowId`, queue it
   instead of dropping; flush once that workflow is registered in `family` (via a later `parentId`
   event). Bound the buffer by size/time.
2. **Eager discovery:** on an unknown-`workflowId` event, fetch `client.workflows.get(id)` to learn its
   `parentId` and register it in `family` immediately, rather than waiting for a `parentId`-bearing event.
3. **Visibility independent of link ordering:** resolve a sub-workflow's visibility from its
   `show`/metadata (fetched on discovery) instead of relying on the link document arriving first.

Option 1 or 2 is likely the smallest robust fix.

## Repro

1. Start the loopstack-engineer app (`npm start`, one stable instance).
2. `loopstack run engineer --arg prompt="say hi"` (a fast/cached task) → live output shows only the
   `⧉ Claude Code Sandbox` link + the parent result.
3. `loopstack runs <run-id>` → the full nested transcript is present. Confirms live-follow-only.

## Workarounds (today)

- `loopstack runs <run-id>` — full nested transcript after the fact.
- `loopstack attach <run-id>` — reattach to a live run.
- Open the Studio link (`⧉ …`).

## Affected files

- `packages/cli/src/run/follow.ts` — family discovery + depth/visibility gating.
- `packages/cli/src/commands/run.ts` — `visibleWorkflowIds` wiring.
- `packages/cli/src/run/documents.ts` — link-document → `visibleWorkflowIds` population.
