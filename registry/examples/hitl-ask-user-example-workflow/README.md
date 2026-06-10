---
title: HITL Ask User Example
description: Example prompting the user for free-text input using AskUserWorkflow as a sub-workflow with callback, waiting on human input without blocking
---

# @loopstack/hitl-ask-user-example-workflow

Demonstrates how to prompt the user for free-text input from inside a workflow using the `AskUserWorkflow` from [`@loopstack/hitl`](https://loopstack.ai/docs/registry/features/hitl-module). The user's answer is captured and echoed back as an assistant message.

## By using this example you'll get...

- A parent workflow that launches `AskUserWorkflow` as a sub-workflow with a callback
- A concrete pattern for waiting on human input without blocking the worker
- An `AskUserDocument` rendered in the UI while the workflow is paused

## Installation

```sh
npm install @loopstack/hitl-ask-user-example-workflow
```

The package depends on `@loopstack/hitl`.

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { HitlAskUserExampleModule, HitlAskUserExampleWorkflow } from '@loopstack/hitl-ask-user-example-workflow';

@StudioApp({
  title: 'HITL Ask User Example',
  workflows: [HitlAskUserExampleWorkflow],
})
@Module({
  imports: [HitlAskUserExampleModule],
})
export class MyAppModule {}
```

## How It Works

1. The workflow starts and calls `AskUserWorkflow.run({ question })` as a sub-workflow.
2. The sub-workflow renders an `AskUserDocument` and stops at `waiting_for_user`.
3. When the user submits an answer, the sub-workflow finishes and the parent's callback fires.
4. The parent saves a `MessageDocument` with the answer and ends.

## Public API

- `HitlAskUserExampleModule`
- `HitlAskUserExampleWorkflow`

## Dependencies

- `@loopstack/common`
- `@loopstack/hitl`
