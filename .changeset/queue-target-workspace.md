---
'@loopstack/common': minor
'@loopstack/core': minor
---

Let a sub-workflow run in another workspace: `RunOptions.workspaceId` on `workflow.run()` /
`orchestrator.queue()` names the workspace the child belongs to, defaulting to the parent's as before.

Tasks serialize per workspace, so this is what lets a parent start work that runs **at the same time** as
its own workspace's rather than behind it — the child takes the named workspace's lock instead. The parent
callback is unaffected: it is still scheduled under the parent's own workspace, so ordering there is
unchanged and a child finishing elsewhere resumes its parent exactly as one at home does. The workspace must
already exist.
