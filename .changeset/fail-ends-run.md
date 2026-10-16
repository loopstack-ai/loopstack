---
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/core': minor
---

A run ends in one of two ways: it completes when it reaches `end`, and it fails when a transition calls `this.fail(message)`. Everything the calling transition did is committed together with the failure, so the documents that explain it survive, and the run is over: nothing is offered at the place it stopped at, and a parent receives it through its `onFailure` transition.

This is for a step that did its work and then found the run cannot succeed, such as one that released what the run was holding and must now report why. A step whose own work did not get done throws instead, which rolls the transition back and leaves the run where it was with its Retry.

`fail()` stops the transition at the call, so nothing below it runs. The `run.settled` trace event carries the reason as `error`.

`fail` joins `run` and the state setters as a name a transition method cannot take.
