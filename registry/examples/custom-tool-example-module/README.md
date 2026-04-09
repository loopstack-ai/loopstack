# @loopstack/custom-tool-example-module

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a complete example demonstrating how to implement and use custom tools in a Loopstack workflow.

## Overview

Custom tools are the building blocks of Loopstack automations. This module serves as a hands-on reference for developers learning how to extend Loopstack with their own functionality.

By exploring this example, you'll understand:

- How to create tools that extend `BaseTool` with a `call()` method
- The difference between stateless and stateful tools
- How to define input schemas with Zod on the `@Tool` decorator
- How to use NestJS dependency injection in tools
- How to wire tools into workflows using `@InjectTool()`
- How to use `wait: true` on transitions for manual triggers
- How to return output from a workflow

This is a great starting point before building your own custom tools.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Creating Custom Tools

#### 1. Stateful Tool (Counter)

A simple tool that maintains internal state across calls. It extends `BaseTool` and implements a `call()` method:

```typescript
import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description: 'Counter tool.',
  },
})
export class CounterTool extends BaseTool {
  count: number = 0;

  call(_args?: object): Promise<ToolResult<number>> {
    this.count++;
    return Promise.resolve({ data: this.count });
  }
}
```

The `count` property persists across calls within the same workflow execution, so each call increments the counter.

#### 2. Tool with Input Schema and Dependency Injection

A tool that accepts typed arguments via a Zod schema and uses NestJS dependency injection for services:

```typescript
import { Inject } from '@nestjs/common';
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
  uiConfig: {
    description: 'Math tool calculating the sum of two arguments by using an injected service.',
  },
  schema: MathSumSchema,
})
export class MathSumTool extends BaseTool {
  @Inject()
  private mathService: MathService;

  call(args: MathSumArgs): Promise<ToolResult<number>> {
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

The workflow extends `BaseWorkflow<TArgs>` with a typed argument object. The schema is defined in the `@Workflow` decorator:

```typescript
@Workflow({
  uiConfig: __dirname + '/custom-tool-example.ui.yaml',
  schema: z
    .object({
      a: z.number().default(1),
      b: z.number().default(2),
    })
    .strict(),
})
export class CustomToolExampleWorkflow extends BaseWorkflow<{ a: number; b: number }> {
  @InjectTool() private counterTool: CounterTool;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectTool() private mathTool: MathSumTool;

  total?: number;
}
```

### Key Concepts

#### 1. Calling Custom Tools

Call tools via `this.tool.call(args)` inside transition methods. Store the result as an instance property:

```typescript
@Initial({ to: 'waiting_for_user' })
async calculate(args: { a: number; b: number }) {
  const calcResult = await this.mathTool.call({ a: args.a, b: args.b });
  this.total = calcResult.data as number;

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Tool calculation result:\n${args.a} + ${args.b} = ${this.total}`,
  });

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Alternatively, using workflow method:\n${args.a} + ${args.b} = ${this.sum(args.a, args.b)}`,
  });
}
```

#### 2. Stateful Tool Behavior

The counter tool increments on each call, demonstrating that tool state persists within a workflow execution:

```typescript
const c1 = await this.counterTool.call({});
const c2 = await this.counterTool.call({});
const c3 = await this.counterTool.call({});

await this.createChatMessage.call({
  role: 'assistant',
  content: `Counter before pause: ${c1.data}, ${c2.data}, ${c3.data}\n\nPress Next to continue...`,
});
```

#### 3. Wait Transitions

Use `wait: true` on a transition to pause the workflow until it is manually triggered (e.g., by user input):

```typescript
@Transition({ from: 'waiting_for_user', to: 'resumed', wait: true })
async userContinue() {}
```

The workflow pauses at the `waiting_for_user` state until an external signal triggers the `userContinue` transition.

#### 4. Workflow Output

A `@Final` method can return data as the workflow output:

```typescript
@Final({ from: 'resumed' })
async continueCount(): Promise<{ total: number | undefined }> {
  const c4 = await this.counterTool.call({});
  const c5 = await this.counterTool.call({});
  const c6 = await this.counterTool.call({});

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Counter after resume: ${c4.data}, ${c5.data}, ${c6.data}\n\nIf state persisted, this should be 4, 5, 6.`,
  });

  return { total: this.total };
}
```

After resuming, the counter continues from where it left off (4, 5, 6), demonstrating that tool state survives a `wait` pause.

#### 5. Private Helper Methods

Define private methods for reusable logic within the workflow:

```typescript
private sum(a: number, b: number) {
  return a + b;
}
```

### Complete Workflow

```typescript
import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { MathSumTool } from '../tools';
import { CounterTool } from '../tools';

@Workflow({
  uiConfig: __dirname + '/custom-tool-example.ui.yaml',
  schema: z
    .object({
      a: z.number().default(1),
      b: z.number().default(2),
    })
    .strict(),
})
export class CustomToolExampleWorkflow extends BaseWorkflow<{ a: number; b: number }> {
  @InjectTool() private counterTool: CounterTool;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectTool() private mathTool: MathSumTool;

  total?: number;

  @Initial({ to: 'waiting_for_user' })
  async calculate(args: { a: number; b: number }) {
    const calcResult = await this.mathTool.call({ a: args.a, b: args.b });
    this.total = calcResult.data as number;

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Tool calculation result:\n${args.a} + ${args.b} = ${this.total}`,
    });

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Alternatively, using workflow method:\n${args.a} + ${args.b} = ${this.sum(args.a, args.b)}`,
    });

    const c1 = await this.counterTool.call({});
    const c2 = await this.counterTool.call({});
    const c3 = await this.counterTool.call({});

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Counter before pause: ${c1.data}, ${c2.data}, ${c3.data}\n\nPress Next to continue...`,
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'resumed', wait: true })
  async userContinue() {}

  @Final({ from: 'resumed' })
  async continueCount(): Promise<{ total: number | undefined }> {
    const c4 = await this.counterTool.call({});
    const c5 = await this.counterTool.call({});
    const c6 = await this.counterTool.call({});

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Counter after resume: ${c4.data}, ${c5.data}, ${c6.data}\n\nIf state persisted, this should be 4, 5, 6.`,
    });

    return { total: this.total };
  }

  private sum(a: number, b: number) {
    return a + b;
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Base classes, decorators, and tool injection
- `@loopstack/create-chat-message-tool` - Provides `CreateChatMessage` tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
