---
'@loopstack/common': patch
'@loopstack/core': patch
'@loopstack/loopstack-studio': patch
'@loopstack/hitl': patch
'@loopstack/oauth-module': patch
'@loopstack/remote-client': patch
'@loopstack/hitl-examples': patch
'@loopstack/llm-examples': patch
---

A keyed save is placed at the end by default; `position: 'keep'` updates in place.

Saving again under a `key` writes a new revision and invalidates the previous ones. The new `position` save
option decides where it sits in the workflow's document list:

- `'end'` (default): appended, like any new document. A card shown again after more work has happened — a
  decision gate re-presented after a reply — sits below that work, at the bottom where the user is.
- `'keep'`: in the place of the revision it supersedes, for an entry that changes over time (status
  tickers, streamed messages, terminal output, form state, sub-workflow links).

Tool document declarations accept `position` too. The sub-workflow link document, the bash tool's live
output, the OAuth prompt, the ask-user question and the examples' status and form documents update in
place. The Studio run view draws nothing at the place a revision moved away from.
