---
title: Accessing Tool Results Example
description: Example workflow showing how to store and access data across workflow transitions using typed workflow state
---

# @loopstack/accessing-tool-results-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to store and access data across workflow transitions using typed workflow state.

## Overview

The workflow shows how to persist data between transitions by returning updated state from transition methods. Understanding this pattern is essential for building workflows that pass data between steps. For example, storing tool results in one transition and reading them in the next.

By using this workflow as a reference, you'll learn how to:

- Define a typed state interface for your workflow
- Store data in the initial transition and return updated state
- Access stored data in later transitions via the `state` parameter
- Save chat messages with `MessageDocument` and `DocumentStore`

This example is useful for developers learning to build data-driven workflows that need to pass information between steps.

## Installation

```bash
npm install @loopstack/accessing-tool-results-example-workflow
```

Then register the module in your app:

```typescript
import {
  ToolResultsExampleModule,
  WorkflowToolResultsWorkflow,
} from '@loopstack/accessing-tool-results-example-workflow';
import { StudioApp } from '@loopstack/common';

@StudioApp({
  title: 'Tool Results Example',
  workflows: [WorkflowToolResultsWorkflow],
})
@Module({
  imports: [ToolResultsExampleModule],
})
export class MyAppModule {}
```

## How It Works

### Workflow State

State is defined as a TypeScript interface and passed to each transition method. Return the updated state from a transition to persist it for subsequent steps:

```typescript
interface ToolResultsState {
  storedMessage?: string;
}

@Workflow({
  uiConfig: __dirname + '/workflow-tool-results.ui.yaml',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow<Record<string, unknown>, ToolResultsState> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }
}
```

### Key Concepts

#### 1. Storing Data in State

In the initial transition, save a message document and return updated state:

```typescript
@Transition({ to: 'data_created' })
async createSomeData(
  ctx: WorkflowContext,
  args: Record<string, unknown>,
  state: ToolResultsState,
): Promise<ToolResultsState> {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Stored in initial transition: Hello World.`,
  });
  return { ...state, storedMessage: 'Hello World.' };
}
```

The returned state is persisted automatically and available in later transitions.

#### 2. Accessing Data Across Transitions

In a subsequent transition, read values from the `state` parameter:

```typescript
@Transition({ from: 'data_created', to: 'end' })
async accessData(ctx: WorkflowContext, state: ToolResultsState): Promise<unknown> {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Accessed from previous transition: ${state.storedMessage}`,
  });
  return {};
}
```

### Complete Workflow

```typescript
import { Inject } from '@nestjs/common';
import { BaseWorkflow, DOCUMENT_STORE, Final, Initial, MessageDocument, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';

interface ToolResultsState {
  storedMessage?: string;
}

@Workflow({
  uiConfig: __dirname + '/workflow-tool-results.ui.yaml',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow<Record<string, unknown>, ToolResultsState> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  @Transition({ to: 'data_created' })
  async createSomeData(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: ToolResultsState,
  ): Promise<ToolResultsState> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Stored in initial transition: Hello World.`,
    });
    return { ...state, storedMessage: 'Hello World.' };
  }

  @Transition({ from: 'data_created', to: 'end' })
  async accessData(ctx: WorkflowContext, state: ToolResultsState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Accessed from previous transition: ${state.storedMessage}`,
    });
    return {};
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` — Base classes, decorators, `DocumentStore`, and `MessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
