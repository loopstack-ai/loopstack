---
'@loopstack/cli': minor
---

Prompt discovery now runs on the canonical park-view rules from `@loopstack/contracts/park-view` — the same rules `TestRun.parkView()` asserts against; the CLI keeps only its tree fetching and collect-widget answerability. Two behavior refinements come with the shared rules: documents hidden via `meta.hideAtPlaces` or internal tagging are no longer offered as prompts, and a widget declaring no transition is only answerable when exactly one transition is available.
