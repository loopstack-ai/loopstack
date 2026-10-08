---
'@loopstack/advanced-workflows-examples': minor
---

The workflow result example shows the published result apart from private state.

- `WorkflowResultWorkflow` (`workflow_result`, "Advanced - Workflow Result Example") keeps a name in state and builds
  its result across two transitions with `assignResult()`. The run's result is `{ greeting, shout }`; the name is not
  published.
- `WorkflowStateWorkflow` and `WorkflowResultWorkflow` each have a spec.
