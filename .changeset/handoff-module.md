---
'@loopstack/handoff-module': minor
---

Add `@loopstack/handoff-module`, the backend side of the Studio Handoff panel. `HandoffModule.forFeature()`
registers the `handoff` feature. `HandoffDocument` shows a copy-a-command or open-a-URL card, and
`ChangedFilesDocument` shows a changed-file tree with Zed, VS Code and file-explorer actions; both are tagged
`handoff` and appear in the panel. `TerminalHandoffDocument` drives the CLI's `terminal-handoff` widget, and
Studio renders it as a copy-the-command card with an "End session" button that fires `handoffDone` by hand.
