---
"@loopstack/common": minor
---

Add `TerminalDocument` — a document type for raw terminal output.

`TerminalDocument` (`{ text, title? }`) stores a terminal stream verbatim, ANSI
escape codes intact, and renders in Studio as a dark, monospaced terminal card
that interprets those escapes as colors. Use it for live logs from subprocesses
(clone/install/build/boot output, npm/tsx/git) instead of dumping raw output —
with its `\x1b[..m` codes showing as noise — into a Markdown code block.
