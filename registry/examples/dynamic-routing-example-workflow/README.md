# @loopstack/dynamic-routing-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to implement conditional routing based on runtime values using guards and transition priorities.

## Overview

The Dynamic Routing Example Workflow shows how to create branching logic in workflows using `@Guard` decorators and `@Transition` priorities. It demonstrates how to route execution through different paths based on input values.

By using this workflow as a reference, you'll learn how to:

- Define a workflow schema with `z.object()` for typed input arguments
- Use `@Guard('methodName')` to conditionally gate transitions
- Control transition evaluation order with the `priority` option
- Build multi-level branching structures with fallback routes

This example is useful for developers building workflows that require decision trees, validation flows, or any logic that branches based on data.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Workflow Class

The workflow extends `BaseWorkflow<TArgs>` with a typed argument object. The schema is defined in the `@Workflow` decorator using Zod:

```typescript
@Workflow({
  uiConfig: __dirname + '/dynamic-routing-example.ui.yaml',
  schema: z
    .object({
      value: z.number().default(150),
    })
    .strict(),
})
export class DynamicRoutingExampleWorkflow extends BaseWorkflow<{ value: number }> {
  @InjectTool() createChatMessage: CreateChatMessage;

  value!: number;
}
```

### Key Concepts

#### 1. Receiving Input Arguments

The `@Initial` transition receives the validated input as a method argument. Store it as an instance property for use in guards and later transitions:

```typescript
@Initial({ to: 'prepared' })
async createMockData(args: { value: number }) {
  this.value = args.value;
  await this.createChatMessage.call({
    role: 'assistant',
    content: `Analysing value = ${this.value}`,
  });
}
```

#### 2. Guard Methods

A guard is a method that returns a boolean. It determines whether a transition should be taken. Reference it by name in the `@Guard` decorator:

```typescript
@Transition({ from: 'prepared', to: 'placeA', priority: 10 })
@Guard('isAbove100')
routeToPlaceA() {}

isAbove100() {
  return this.value > 100;
}
```

When the workflow reaches the `prepared` state, it evaluates guards on all transitions from that state. If `isAbove100()` returns `true`, the workflow moves to `placeA`.

#### 3. Transition Priority

When multiple transitions share the same `from` state, `priority` controls evaluation order (higher priority is evaluated first). The first transition whose guard passes (or that has no guard) is taken:

```typescript
// Evaluated first (priority: 10) -- taken if value > 100
@Transition({ from: 'prepared', to: 'placeA', priority: 10 })
@Guard('isAbove100')
routeToPlaceA() {}

// Evaluated second (no priority = default) -- fallback route
@Transition({ from: 'prepared', to: 'placeB' })
routeToPlaceB() {}
```

A transition without a `@Guard` always matches, acting as a fallback.

#### 4. Multi-Level Branching

Chain conditional transitions to create decision trees. After reaching `placeA`, a second level of guards routes further:

```typescript
@Transition({ from: 'placeA', to: 'placeC', priority: 10 })
@Guard('isAbove200')
routeToPlaceC() {}

isAbove200() {
  return this.value > 200;
}

@Transition({ from: 'placeA', to: 'placeD' })
routeToPlaceD() {}
```

#### 5. Complete Routing Flow

The workflow routes through different states based on the input value:

- **value <= 100** -> placeB -> "Value is less or equal 100"
- **100 < value <= 200** -> placeA -> placeD -> "Value is less or equal 200, but greater than 100"
- **value > 200** -> placeA -> placeC -> "Value is greater than 200"

### Complete Workflow

```typescript
import { z } from 'zod';
import { BaseWorkflow, Final, Guard, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Workflow({
  uiConfig: __dirname + '/dynamic-routing-example.ui.yaml',
  schema: z
    .object({
      value: z.number().default(150),
    })
    .strict(),
})
export class DynamicRoutingExampleWorkflow extends BaseWorkflow<{ value: number }> {
  @InjectTool() createChatMessage: CreateChatMessage;

  value!: number;

  @Initial({ to: 'prepared' })
  async createMockData(args: { value: number }) {
    this.value = args.value;
    await this.createChatMessage.call({
      role: 'assistant',
      content: `Analysing value = ${this.value}`,
    });
  }

  @Transition({ from: 'prepared', to: 'placeA', priority: 10 })
  @Guard('isAbove100')
  routeToPlaceA() {}

  isAbove100() {
    return this.value > 100;
  }

  @Transition({ from: 'prepared', to: 'placeB' })
  routeToPlaceB() {}

  @Transition({ from: 'placeA', to: 'placeC', priority: 10 })
  @Guard('isAbove200')
  routeToPlaceC() {}

  isAbove200() {
    return this.value > 200;
  }

  @Transition({ from: 'placeA', to: 'placeD' })
  routeToPlaceD() {}

  @Final({ from: 'placeB' })
  async showMessagePlaceB() {
    await this.createChatMessage.call({
      role: 'assistant',
      content: 'Value is less or equal 100',
    });
  }

  @Final({ from: 'placeC' })
  async showMessagePlaceC() {
    await this.createChatMessage.call({
      role: 'assistant',
      content: 'Value is greater than 200',
    });
  }

  @Final({ from: 'placeD' })
  async showMessagePlaceD() {
    await this.createChatMessage.call({
      role: 'assistant',
      content: 'Value is less or equal 200, but greater than 100',
    });
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Base classes, decorators, guards, and tool injection
- `@loopstack/create-chat-message-tool` - Provides `CreateChatMessage` tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
