---
title: Custom Tool Example
description: Example implementing custom tools in a Loopstack workflow — BaseTool subclass, @Tool decorator, Zod schema, tool registration and injection
---

# @loopstack/custom-tool-example-module

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a complete example demonstrating how to implement and use custom tools in a Loopstack workflow.

## Overview

Custom tools are the building blocks of Loopstack automations. This module serves as a hands-on reference for developers learning how to extend Loopstack with their own functionality.

By exploring this example, you'll understand:

- How to create tools that extend `BaseTool` with a `handle()` method
- The difference between stateless and stateful tools
- How to define input schemas with Zod on the `@Tool` decorator
- How to use NestJS dependency injection in tools and workflows
- How to wire tools into workflows via constructor injection
- How to use `wait: true` on transitions for manual triggers
- How to return output from a workflow

This is a great starting point before building your own custom tools.

## Installation

```bash
npm install @loopstack/custom-tool-example-module
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { CustomToolExampleWorkflow, CustomToolModule } from '@loopstack/custom-tool-example-module';

@StudioApp({
  title: 'Custom Tool Example',
  workflows: [CustomToolExampleWorkflow],
})
@Module({
  imports: [CustomToolModule],
})
export class MyAppModule {}
```

## How It Works

### Module Setup

Register the workflow, tools, and any supporting services as NestJS providers:

```typescript
@Module({
  providers: [CustomToolExampleWorkflow, MathSumTool, CounterTool, MathService],
  exports: [CustomToolExampleWorkflow, MathSumTool, CounterTool, MathService],
})
export class CustomToolModule {}
```

### Creating Custom Tools

#### 1. Stateful Tool (Counter)

A simple tool that maintains internal state across calls. It extends `BaseTool` and implements `handle()`:

```typescript
import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  name: 'counter',
  uiConfig: {
    description: 'Counter tool.',
  },
})
export class CounterTool extends BaseTool<object, object, number> {
  count: number = 0;

  protected async handle(_args?: object): Promise<ToolResult<number>> {
    this.count++;
    return Promise.resolve({ data: this.count });
  }
}
```

The `count` property persists across calls within the same workflow execution, so each call increments the counter.

#### 2. Tool with Input Schema and Dependency Injection

A tool that accepts typed arguments via a Zod schema and uses NestJS constructor injection for services:

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { MathService } from '../services/math.service';

const MathSumSchema = z
  .object({
    a: z.number(),
    b: z.number(),
  })
  .strict();

type MathSumArgs = z.infer<typeof MathSumSchema>;

@Tool({
  name: 'math_sum',
  uiConfig: {
    description: 'Math tool calculating the sum of two arguments by using an injected service.',
  },
  schema: MathSumSchema,
})
export class MathSumTool extends BaseTool<MathSumArgs, object, number> {
  constructor(private readonly mathService: MathService) {
    super();
  }

  protected async handle(args: MathSumArgs): Promise<ToolResult<number>> {
    const sum = this.mathService.sum(args.a, args.b);
    return Promise.resolve({ data: sum });
  }
}
```

The `schema` option on `@Tool` validates incoming arguments. The injected `MathService` is a standard NestJS injectable:

```typescript
@Injectable()
export class MathService {
  public sum(a: number, b: number) {
    return a + b;
  }
}
```

### Workflow Class

The workflow extends `BaseWorkflow` with typed arguments and typed state. The argument schema is defined in the `@Workflow` decorator:

```typescript
interface CustomToolExampleState {
  total?: number;
}

@Workflow({
  uiConfig: __dirname + '/custom-tool-example.ui.yaml',
  schema: z
    .object({
      a: z.number().default(1),
      b: z.number().default(2),
    })
    .strict(),
})
export class CustomToolExampleWorkflow extends BaseWorkflow<{ a: number; b: number }, CustomToolExampleState> {
  constructor(
    private readonly counterTool: CounterTool,
    private readonly mathTool: MathSumTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }
}
```

Tools registered in the same NestJS module are injected via the constructor. Call them with `this.tool.call(args)`. `call()` is provided by `BaseTool` and delegates to your `handle()` implementation.

### Key Concepts

#### 1. Calling Custom Tools

Call tools inside transition methods and store results in workflow state:

```typescript
@Transition({ to: 'waiting_for_user' })
async calculate(
  ctx: WorkflowContext,
  args: { a: number; b: number },
  state: CustomToolExampleState,
): Promise<CustomToolExampleState> {
  const calcResult = await this.mathTool.call({ a: args.a, b: args.b });
  const total = calcResult.data as number;

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    content: `Tool calculation result:\n${args.a} + ${args.b} = ${total}`,
  });

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    content: `Alternatively, using workflow method:\n${args.a} + ${args.b} = ${this.sum(args.a, args.b)}`,
  });

  return { ...state, total };
}
```

The workflow then prints a second message using `this.sum(args.a, args.b)`. That private helper is **intentional demo redundancy**. It shows the same calculation can also live as workflow-local logic. In production you would normally pick one approach: call a tool (reusable, injectable, schema-validated) or use a private helper (simple, workflow-specific). Here both are shown side by side for comparison. Note that `total` stored in workflow state comes from the tool result, not from `sum()`.

#### 2. Stateful Tool Behavior

The counter tool increments on each call, demonstrating that tool state persists within a workflow execution:

```typescript
const c1 = await this.counterTool.call();
const c2 = await this.counterTool.call();
const c3 = await this.counterTool.call();

await this.documentStore.save(MessageDocument, {
  role: 'assistant',
  content: `Counter before pause: ${c1.data}, ${c2.data}, ${c3.data}\n\nPress Next to continue...`,
});
```

#### 3. Wait Transitions

Use `wait: true` on a transition to pause the workflow until it is manually triggered (e.g., by a UI button):

```typescript
@Transition({ from: 'waiting_for_user', to: 'resumed', wait: true })
async userContinue(ctx: WorkflowContext, state: CustomToolExampleState): Promise<CustomToolExampleState> {
  return state;
}
```

The workflow pauses at `waiting_for_user` until the user triggers the `userContinue` transition.

#### 4. Workflow Output

A terminal `@Transition` method can return data as the workflow output:

```typescript
@Transition({ from: 'resumed', to: 'end' })
async continueCount(ctx: WorkflowContext, state: CustomToolExampleState): Promise<{ total: number | undefined }> {
  const c4 = await this.counterTool.call();
  const c5 = await this.counterTool.call();
  const c6 = await this.counterTool.call();

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    content: `Counter after resume: ${c4.data}, ${c5.data}, ${c6.data}\n\nIf state persisted, this should be 4, 5, 6.`,
  });

  return { total: state.total };
}
```

After resuming, the counter continues from where it left off (4, 5, 6), demonstrating that tool state survives a `wait` pause.

#### 5. Private Helper Methods

Define private methods for reusable logic within the workflow. In this example, `sum()` mirrors what `MathSumTool` already does. It exists only to demonstrate that alternative:

```typescript
private sum(a: number, b: number) {
  return a + b;
}
```

Use helpers for workflow-specific formatting or glue logic; use tools when the logic should be shared, tested independently, or exposed to agents.

### Complete Workflow

```typescript
import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, DOCUMENT_STORE, Final, Initial, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
import { CounterTool, MathSumTool } from '../tools';

interface CustomToolExampleState {
  total?: number;
}

@Workflow({
  uiConfig: __dirname + '/custom-tool-example.ui.yaml',
  schema: z
    .object({
      a: z.number().default(1),
      b: z.number().default(2),
    })
    .strict(),
})
export class CustomToolExampleWorkflow extends BaseWorkflow<{ a: number; b: number }, CustomToolExampleState> {
  constructor(
    private readonly counterTool: CounterTool,
    private readonly mathTool: MathSumTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async calculate(
    ctx: WorkflowContext,
    args: { a: number; b: number },
    state: CustomToolExampleState,
  ): Promise<CustomToolExampleState> {
    const calcResult = await this.mathTool.call({ a: args.a, b: args.b });
    const total = calcResult.data as number;

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Tool calculation result:\n${args.a} + ${args.b} = ${total}`,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Alternatively, using workflow method:\n${args.a} + ${args.b} = ${this.sum(args.a, args.b)}`,
    });

    const c1 = await this.counterTool.call();
    const c2 = await this.counterTool.call();
    const c3 = await this.counterTool.call();

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Counter before pause: ${c1.data}, ${c2.data}, ${c3.data}\n\nPress Next to continue...`,
    });
    return { ...state, total };
  }

  @Transition({ from: 'waiting_for_user', to: 'resumed', wait: true })
  async userContinue(ctx: WorkflowContext, state: CustomToolExampleState): Promise<CustomToolExampleState> {
    return state;
  }

  @Transition({ from: 'resumed', to: 'end' })
  async continueCount(ctx: WorkflowContext, state: CustomToolExampleState): Promise<{ total: number | undefined }> {
    const c4 = await this.counterTool.call();
    const c5 = await this.counterTool.call();
    const c6 = await this.counterTool.call();

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Counter after resume: ${c4.data}, ${c5.data}, ${c6.data}\n\nIf state persisted, this should be 4, 5, 6.`,
    });

    return { total: state.total };
  }

  private sum(a: number, b: number) {
    return a + b;
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common`: Base classes, decorators, `BaseTool`, `DocumentStore`, and `MessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
