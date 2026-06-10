---
title: HITL Confirm Example
description: Example asking the user for yes/no confirmation using ConfirmUserWorkflow as a sub-workflow, branching on confirmed/denied outcome
---

# @loopstack/hitl-confirm-example-workflow

Demonstrates how to ask the user for a yes/no confirmation from inside a workflow using the `ConfirmUserWorkflow` from [`@loopstack/hitl`](https://loopstack.ai/docs/registry/features/hitl-module) and branch on the decision.

## By using this example you'll get...

- A parent workflow that launches `ConfirmUserWorkflow` as a sub-workflow
- Two different outcome branches for the `confirmed` / `denied` paths
- A `ConfirmUserDocument` rendered in the UI while the workflow is paused

## Installation

```sh
npm install @loopstack/hitl-confirm-example-workflow
```

The package depends on `@loopstack/hitl`.

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { HitlConfirmExampleModule, HitlConfirmExampleWorkflow } from '@loopstack/hitl-confirm-example-workflow';

@StudioApp({
  title: 'HITL Confirm Example',
  workflows: [HitlConfirmExampleWorkflow],
})
@Module({
  imports: [HitlConfirmExampleModule],
})
export class MyAppModule {}
```

## How It Works

1. The workflow starts and calls `ConfirmUserWorkflow.run({ markdown })` as a sub-workflow.
2. The sub-workflow renders a `ConfirmUserDocument` and stops.
3. When the user confirms or denies, the parent's callback fires with `data.confirmed`.
4. The parent saves a `MessageDocument` indicating which branch was taken.

## Public API

- `HitlConfirmExampleModule`
- `HitlConfirmExampleWorkflow`

## Dependencies

- `@loopstack/common`
- `@loopstack/hitl`
