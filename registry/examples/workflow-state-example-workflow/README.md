---
title: Workflow State Example
description: Example workflow managing state across transitions using a typed state object — typed state interface, state persistence, accessing state in transitions
---

# @loopstack/workflow-state-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to manage state across transitions using a typed state object.

## Overview

The Workflow State Example Workflow shows how to pass data through a typed state object across transitions. It demonstrates the core patterns for managing data flow in a workflow.

By using this workflow as a reference, you'll learn how to:

- Define a typed state interface for your workflow
- Return updated state from transitions
- Access state in subsequent transitions
- Create private helper methods to transform state data

This example is useful for developers building workflows that need to store and manipulate data across transitions.

## Installation

```bash
npm install @loopstack/workflow-state-example-workflow
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { WorkflowStateExampleModule, WorkflowStateWorkflow } from '@loopstack/workflow-state-example-workflow';

@StudioApp({
  title: 'Workflow State Example',
  workflows: [WorkflowStateWorkflow],
})
@Module({
  imports: [WorkflowStateExampleModule],
})
export class MyAppModule {}
```

## How It Works

### Key Concepts

#### 1. Defining Workflow State

State is defined as a typed interface and applied per-transition on the `state` parameter. The class itself just extends `BaseWorkflow`:

```typescript
interface WorkflowStateState {
  message?: string;
}

@Workflow({
  title: 'Workflow State',
})
export class WorkflowStateWorkflow extends BaseWorkflow {
```

The state object is passed to each transition and persists across transitions automatically.

#### 2. Storing Data in State

Return updated state from a transition method:

```typescript
@Transition({ to: 'data_created' })
async createSomeData(state: WorkflowStateState): Promise<WorkflowStateState> {
  return { ...state, message: 'Hello :)' };
}
```

The returned state is passed to the next transition.

#### 3. Accessing State in Later Transitions

State is available as the first parameter in any subsequent transition method:

```typescript
@Transition({ from: 'data_created', to: 'end' })
async showResults(state: WorkflowStateState): Promise<unknown> {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Data from state: ${state.message}`,
  });

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Use workflow helper method: ${this.messageInUpperCase(state.message!)}`,
  });
  return {};
}
```

#### 4. Private Helper Methods

Define private methods to transform or process state data:

```typescript
private messageInUpperCase(message: string): string {
  return message?.toUpperCase();
}
```

These are standard TypeScript methods with no decorator required. Call them from any transition using `this.messageInUpperCase(...)`.

### Complete Workflow

```typescript
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

interface WorkflowStateState {
  message?: string;
}

@Workflow({
  title: 'Workflow State',
})
export class WorkflowStateWorkflow extends BaseWorkflow {
  @Transition({ to: 'data_created' })
  async createSomeData(state: WorkflowStateState): Promise<WorkflowStateState> {
    return { ...state, message: 'Hello :)' };
  }

  @Transition({ from: 'data_created', to: 'end' })
  async showResults(state: WorkflowStateState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Data from state: ${state.message}`,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Use workflow helper method: ${this.messageInUpperCase(state.message!)}`,
    });
    return {};
  }

  private messageInUpperCase(message: string): string {
    return message?.toUpperCase();
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Base classes, decorators, and `MessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
