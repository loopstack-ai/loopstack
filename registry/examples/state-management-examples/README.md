---
title: State Management Examples
description: Workflow examples for state in Loopstack — persisting typed state across transitions with assignState() and carrying a step's output forward to later steps.
---

# @loopstack/state-management-examples

> State management workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

A workflow transition receives the state as its first argument and writes to it with `assignState()` /
`setState()`. These two examples show the whole of it: assigning a value in one transition and reading it in
the next, and using that same mechanism to carry a step's output forward. Reach for these when a later step
needs something an earlier step produced.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/state-management-examples src/state-management-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { StateManagementExamplesModule } from './state-management-examples/state-management-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), StateManagementExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/state-management-examples
```

```typescript
import { StateManagementExamplesModule } from '@loopstack/state-management-examples';
```

No provider modules, secrets or environment variables are needed — both workflows are pure state machines.

## Examples

| Example                           | Studio title                                | Run                                   |
| --------------------------------- | ------------------------------------------- | ------------------------------------- |
| [Workflow State](#workflow-state) | `State Management - Workflow State Example` | `loopstack run workflow_state`        |
| [Tool Results](#tool-results)     | `State Management - Tool Results Example`   | `loopstack run workflow_tool_results` |

Start either from the Studio sidebar, or from the CLI against a running app:

```bash
loopstack run workflow_state --json
```

---

## Workflow State

`assignState({ message })` in the first transition; the second transition receives that state as its `state`
argument and renders it. A private workflow method shows that transitions are ordinary class methods and can
share helpers.

Expect two messages: `Data from state: Hello :)` and `Use workflow helper method: HELLO :)`.

### Files

- `workflows/workflow-state/workflow-state-example.workflow.ts`

## Tool Results

The same mechanism applied to the common case: a step produces a value, parks it in state, and a later step
reads it back. Use this whenever a transition needs the output of one that ran before it.

Expect `Accessed from previous transition: Hello World.`

### Files

- `workflows/tool-results/tool-results-example.workflow.ts`

## Tests

```bash
npm test
```

Both workflows run in-process against the real state machine — no database, no LLM.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
