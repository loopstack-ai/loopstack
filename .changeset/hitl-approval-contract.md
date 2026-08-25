---
'@loopstack/hitl': minor
'@loopstack/hitl-examples': minor
'@loopstack/secrets-examples': patch
---

- **`ask_for_approval` has an explicit result contract** (`@loopstack/hitl`): the completed tool returns `{ approved: boolean, message: string, concept?: string }` — a clear positive/negative signal for the calling LLM ("Concept was approved by the user.") plus the final, possibly user-edited concept, instead of only echoing the concept back.
- **`inline_form_example` demonstrates enforced read-only fields** (`@loopstack/hitl-examples`): the form gains a workflow-provided `subject` marked `readonly: true` in the widget config — non-editable in Studio, discarded in the CLI's `$EDITOR`, rejected by the backend.
- **`agentic_example`'s follow-up chat works** (`@loopstack/secrets-examples`): `respond` now parks at `waiting_for_user` instead of ending the run, making the declared chat input reachable — matching the example's description and the other chat agents.
