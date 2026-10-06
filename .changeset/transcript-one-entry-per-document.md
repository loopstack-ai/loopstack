---
'@loopstack/loopstack-studio': patch
---

Draw one entry per document in the run view, not one per revision.

A keyed save does not update a row: it writes a new document, marks the one it supersedes as invalidated,
and passes on its `index`. The transcript window is the `all` scope, because the live delta has to see
invalidated rows to learn that something was superseded — so every revision arrived, and every revision was
drawn. A streaming terminal became one card per poll, and a gate re-presented after a refusal left the
superseded card beside the new one with its buttons still looking live.

Only the live revision is drawn now, and it keeps the position it first appeared at: a revision carries a
newer timestamp, so sorting on it would walk a card that is still being written past everything logged while
it ran.
