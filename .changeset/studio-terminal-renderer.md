---
"@loopstack/loopstack-studio": minor
---

Render `TerminalDocument` as a colored terminal.

Studio now has a `terminal` widget renderer that parses ANSI SGR escape codes
(16-color, bright, xterm 256-color, and truecolor, plus bold/dim/italic/underline)
into a dark, monospaced terminal card that keeps itself scrolled to the newest
line. Terminal output — NestJS logs, npm/tsx, git — keeps its colors instead of
showing raw `\x1b[..m` sequences.
