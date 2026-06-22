---
title: Dynamic Routing Example
description: Example workflow implementing conditional routing based on runtime values using guards and transition priorities
---

# @loopstack/dynamic-routing-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to implement conditional routing based on runtime values using guards and transition priorities.

## Overview

The Dynamic Routing Example Workflow shows how to create branching logic in workflows using `@Guard` decorators and `@Transition` priorities. It demonstrates how to route execution through different paths based on input values.

By using this workflow as a reference, you'll learn how to:

- Define a workflow schema with `z.object()` for typed input arguments
- Store input in typed workflow state for use in guards
- Use `@Guard('methodName')` to conditionally gate transitions
- Control transition evaluation order with the `priority` option
- Build multi-level branching structures with fallback routes

This example is useful for developers building workflows that require decision trees, validation flows, or any logic that branches based on data.

## Installation

```bash
npm install @loopstack/dynamic-routing-example-workflow
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import {
  DynamicRoutingExampleModule,
  DynamicRoutingExampleWorkflow,
} from '@loopstack/dynamic-routing-example-workflow';

@StudioApp({
  title: 'Dynamic Routing Example',
  workflows: [DynamicRoutingExampleWorkflow],
})
@Module({
  imports: [DynamicRoutingExampleModule],
})
export class MyAppModule {}
```

## How It Works

### Module Setup

Register the workflow as a NestJS provider:

```typescript
@Module({
  providers: [DynamicRoutingExampleWorkflow],
  exports: [DynamicRoutingExampleWorkflow],
})
export class DynamicRoutingExampleModule {}
```

### Workflow State

State is defined as a TypeScript interface and passed to each transition method. Return updated state from transitions to persist values for guards and later steps:

```typescript
interface DynamicRoutingState {
  value: number;
}

@Workflow({
  uiConfig: __dirname + '/dynamic-routing-example.ui.yaml',
  schema: z
    .object({
      value: z.number().default(150),
    })
    .strict(),
})
export class DynamicRoutingExampleWorkflow extends BaseWorkflow<{ value: number }> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }
}
```

### Key Concepts

#### 1. Receiving Input Arguments

The first `@Transition` receives validated input as `args`. Store the value in workflow state for guards and routing:

```typescript
@Transition({ to: 'prepared' })
async createMockData(
  ctx: WorkflowContext,
  args: { value: number },
  state: DynamicRoutingState,
) {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Analysing value = ${args.value}`,
  });
  this.assignState({ value: args.value });
}
```

#### 2. Guard Methods

A guard is a method that returns a boolean. It receives workflow state as its first argument. Reference it by name in the `@Guard` decorator:

```typescript
@Transition({ from: 'prepared', to: 'placeA', priority: 10 })
@Guard('isAbove100')
routeToPlaceA(ctx: WorkflowContext, state: DynamicRoutingState) {
}

isAbove100(state: DynamicRoutingState): boolean {
  return state.value > 100;
}
```

When the workflow reaches the `prepared` state, it evaluates guards on all auto-transitions from that state (highest priority first). If `isAbove100(state)` returns `true`, the workflow moves to `placeA`.

Routing transitions like `routeToPlaceA` only pass state through. The guard makes the decision; the transition method moves the state machine to the next place.

#### 3. Transition Priority

When multiple transitions share the same `from` state, `priority` controls evaluation order (higher priority is evaluated first). The first transition whose guard passes (or that has no guard) is taken:

```typescript
// Evaluated first (priority: 10). Taken if value > 100.
@Transition({ from: 'prepared', to: 'placeA', priority: 10 })
@Guard('isAbove100')
routeToPlaceA(ctx: WorkflowContext, state: DynamicRoutingState) {
}

// Evaluated last (no priority). Fallback when value <= 100.
@Transition({ from: 'prepared', to: 'placeB' })
routeToPlaceB(ctx: WorkflowContext, state: DynamicRoutingState) {
}
```

A transition without a `@Guard` always matches once reached, acting as a fallback.

#### 4. Multi-Level Branching

Chain conditional transitions to create decision trees. After reaching `placeA`, a second level of guards routes further:

```typescript
@Transition({ from: 'placeA', to: 'placeC', priority: 10 })
@Guard('isAbove200')
routeToPlaceC(ctx: WorkflowContext, state: DynamicRoutingState) {
}

isAbove200(state: DynamicRoutingState): boolean {
  return state.value > 200;
}

@Transition({ from: 'placeA', to: 'placeD' })
routeToPlaceD(ctx: WorkflowContext, state: DynamicRoutingState) {
}
```

#### 5. Complete Routing Flow

The workflow routes through different states based on the input value:

- **value <= 100** -> placeB -> "Value is less or equal 100"
- **100 < value <= 200** -> placeA -> placeD -> "Value is less or equal 200, but greater than 100"
- **value > 200** -> placeA -> placeC -> "Value is greater than 200"

Terminal terminal `@Transition`s save the result message:

```typescript
@Transition({ from: 'placeB', to: 'end' })
async showMessagePlaceB(ctx: WorkflowContext, state: DynamicRoutingState) {
  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: 'Value is less or equal 100',
  });
}
```

### Complete Workflow

```typescript
import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  DOCUMENT_STORE,
  Final,
  Guard,
  Initial,
  MessageDocument,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';

interface DynamicRoutingState {
  value: number;
}

@Workflow({
  uiConfig: __dirname + '/dynamic-routing-example.ui.yaml',
  schema: z
    .object({
      value: z.number().default(150),
    })
    .strict(),
})
export class DynamicRoutingExampleWorkflow extends BaseWorkflow<{ value: number }> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  @Transition({ to: 'prepared' })
  async createMockData(ctx: WorkflowContext, args: { value: number }, state: DynamicRoutingState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Analysing value = ${args.value}`,
    });
    this.assignState({ value: args.value });
  }

  @Transition({ from: 'prepared', to: 'placeA', priority: 10 })
  @Guard('isAbove100')
  routeToPlaceA(ctx: WorkflowContext, state: DynamicRoutingState) {}

  isAbove100(state: DynamicRoutingState): boolean {
    return state.value > 100;
  }

  @Transition({ from: 'prepared', to: 'placeB' })
  routeToPlaceB(ctx: WorkflowContext, state: DynamicRoutingState) {}

  @Transition({ from: 'placeA', to: 'placeC', priority: 10 })
  @Guard('isAbove200')
  routeToPlaceC(ctx: WorkflowContext, state: DynamicRoutingState) {}

  isAbove200(state: DynamicRoutingState): boolean {
    return state.value > 200;
  }

  @Transition({ from: 'placeA', to: 'placeD' })
  routeToPlaceD(ctx: WorkflowContext, state: DynamicRoutingState) {}

  @Transition({ from: 'placeB', to: 'end' })
  async showMessagePlaceB(ctx: WorkflowContext, state: DynamicRoutingState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is less or equal 100',
    });
  }

  @Transition({ from: 'placeC', to: 'end' })
  async showMessagePlaceC(ctx: WorkflowContext, state: DynamicRoutingState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is greater than 200',
    });
  }

  @Transition({ from: 'placeD', to: 'end' })
  async showMessagePlaceD(ctx: WorkflowContext, state: DynamicRoutingState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is less or equal 200, but greater than 100',
    });
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common`: Base classes, decorators, guards, `DocumentStore`, and `MessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
