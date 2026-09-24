---
'@loopstack/contracts': minor
'@loopstack/api': minor
'@loopstack/loopstack-studio': minor
---

Make a run that is waiting on a person findable.

Run lists filtered on `parentId: null`, which hid two things. A run queued into a workspace by a parent
elsewhere has a parent, so it never appeared in the workspace it actually runs in — the only place anyone
would look for it. And a gate several sub-workflows deep was reachable only by opening each ancestor in turn.

`WorkflowFilterInterface` gains **`topLevel`**: runs that *start* where you are looking — no parent, or a
parent in another workspace. It asks the question the old filter was standing in for, and Studio now offers
it as a visible, removable filter rather than a hidden default, so clearing it widens the list to every run
at any depth.

Finding the ones that need a person took a second field, because `waiting` does not say who is being waited
on: every run that parks without finishing carries it, so a parent sitting on a child's callback looks
exactly like a run holding an unanswered question. `WorkflowItemInterface` gains **`activeChildren`** — the
children still running, waiting or pending — and a waiting run with none of them is marked **Awaiting
input**. It is a proxy for `evaluateWorkflowPrompts`, which is exact but needs every run's documents; its
blind spot is a run parked between automatic retries.

Two fixes fell out of it: Studio's landing page listed runs with status `paused`, which the engine never
assigns, and its run filter offered `paused` while omitting `waiting` — the one state worth filtering by.
Status badges also shared one dark-mode-aware palette now, instead of the run list carrying a light-only
copy of its own.
