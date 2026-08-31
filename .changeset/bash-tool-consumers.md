---
"@loopstack/filesystem-examples": patch
"@loopstack/github-integration": patch
---

Track the bash tool's merged `{ output, exitCode }` result

The `@loopstack/remote-client` bash tool now returns merged `output` instead of separate
`stdout`/`stderr`. The remote-client example workflow and the connect-github workflow are updated to
read `result.data.output`, so they keep working against the new tool result shape.
