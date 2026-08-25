---
'@loopstack/contracts': minor
'@loopstack/testing': minor
---

Canonical park-view rules (`@loopstack/contracts/park-view`): pure functions answering "what would a human see at this park, and what can they submit" — document visibility (`hideAtPlaces`, internal), place activity (`enableAtPlaces`), answered-ness (presence of `answer`, not truthiness), widget state (`showWhen` hides / `enabledWhen` disables), submit-transition resolution (declared∩available, else the lone available one), answerable states (waiting, paused, and failed-with-transitions), candidate evaluation and prompt selection. `TestRun.parkView()` runs these rules over the in-process run tree, so tests assert what the user would actually see — widget, question content, answer schema, default transition — including recovery prompts on runs failed at an error place.
