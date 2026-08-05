---
'@loopstack/loopstack-studio': minor
---

Run View reaches feature parity with the classic workbench view: failed workflows without an answerable recovery prompt offer inline retry (the CLI's recovery-first, plain-re-run-fallback semantics); workbench settings apply (show-full-message-history gates internal documents, debug mode adds per-entry metadata); and the chat input stays visible-but-disabled while the run is generating instead of disappearing between turns.
