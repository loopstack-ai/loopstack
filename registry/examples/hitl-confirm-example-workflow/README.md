# @loopstack/hitl-confirm-example-workflow

Demonstrates how to ask the user for a yes/no confirmation from inside a workflow using the `ConfirmUserWorkflow` from [`@loopstack/hitl`](../../features/hitl-module) and branch on the decision.

## By using this example you'll get...

- A parent workflow that launches `ConfirmUserWorkflow` as a sub-workflow
- Two different outcome branches for the `confirmed` / `denied` paths
- A `ConfirmUserDocument` rendered in the UI while the workflow is paused

## Installation

```sh
loopstack add @loopstack/hitl-confirm-example-workflow
```

This installs `@loopstack/hitl` as a dependency automatically.

## How It Works

1. The workflow starts and calls `ConfirmUserWorkflow.run({ markdown })` as a sub-workflow.
2. The sub-workflow renders a `ConfirmUserDocument` and stops.
3. When the user confirms or denies, the parent's callback fires with `data.confirmed`.
4. The parent saves a `MessageDocument` indicating which branch was taken.

## Public API

- `HitlConfirmExampleModule`
- `HitlConfirmExampleWorkflow`

## Dependencies

- `@loopstack/common`, `@loopstack/core`
- `@loopstack/hitl`
