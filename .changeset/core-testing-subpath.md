---
'@loopstack/core': minor
'@loopstack/testing': minor
---

Expose `runTransition` from `@loopstack/core/testing`.

The helper runs a transition inside a real `ExecutionScope` and returns the committed state and result
drafts, for unit tests that instantiate a workflow directly. It sits beside the `ExecutionScope` and
`RunTraceCollector` it wires up, on a dedicated subpath that keeps it out of the package's main entry point.
