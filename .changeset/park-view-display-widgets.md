---
'@loopstack/contracts': patch
---

Park-view rules no longer treat display-only documents as prompts. A message, markdown, or other display widget (`DISPLAY_WIDGETS`) at a park with a single available transition was being surfaced as the answerable prompt via the lone-transition leniency — so `parkView()` (used with no eligibility predicate) could report the greeting message of a chat instead of the chat input. Display widgets are now excluded from prompt candidates in `evaluateWorkflowPrompts`; the CLI and Studio were unaffected (their eligibility predicates already filtered display widgets), but the testing facade's `run.parkView()` now correctly resolves the interactive widget.
