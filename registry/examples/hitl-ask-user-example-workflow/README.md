# @loopstack/hitl-ask-user-example-workflow

Demonstrates how to prompt the user for free-text input from inside a workflow using the `AskUserWorkflow` from [`@loopstack/hitl`](../../features/hitl-module). The user's answer is captured and echoed back as an assistant message.

## By using this example you'll get...

- A parent workflow that launches `AskUserWorkflow` as a sub-workflow with a callback
- A concrete pattern for waiting on human input without blocking the worker
- An `AskUserDocument` rendered in the UI while the workflow is paused

## Installation

```sh
loopstack add @loopstack/hitl-ask-user-example-workflow
```

This installs `@loopstack/hitl` as a dependency automatically.

## How It Works

1. The workflow starts and calls `AskUserWorkflow.run({ question })` as a sub-workflow.
2. The sub-workflow renders an `AskUserDocument` and stops at `waiting_for_user`.
3. When the user submits an answer, the sub-workflow finishes and the parent's callback fires.
4. The parent saves a `MessageDocument` with the answer and ends.

## Public API

- `HitlAskUserExampleModule`
- `HitlAskUserExampleWorkflow`

## Dependencies

- `@loopstack/common`, `@loopstack/core`
- `@loopstack/hitl`
