---
'@loopstack/loopstack-studio': patch
---

Render the `terminal-handoff` document, with a way to end the session by hand.

A `TerminalHandoffDocument` showed as an unknown document type: only the CLI knew the widget, and only the CLI
could fire its `handoffDone` transition, when the handed-over command exited. A run whose terminal was closed
stayed parked at the hand-off for good, with no button anywhere to release it.

The handoff feature now renders the document as a copy-the-command card with an "End session" button. The
button fires the document's transition while the run offers it, so the run can tear its container down and
finish; once the run has moved on, the card reads as ended.
