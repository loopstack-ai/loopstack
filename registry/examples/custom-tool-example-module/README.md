# @loopstack/custom-tool-example-module

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a complete example demonstrating how to implement and use custom tools in a Loopstack workflow.

## Overview

Custom tools are the building blocks of Loopstack automations. This module serves as a hands-on reference for developers learning how to extend Loopstack with their own functionality.

By exploring this example, you'll understand:

- How to create tools that perform specific tasks within workflows
- The difference between stateless and stateful tools
- How to use dependency injection to keep tools modular and testable
- How to wire tools into workflows using YAML configuration
- How to define workflow input, state, and output
- How to structure and export a reusable module

This is a great starting point before building your own custom tools.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Creating Custom Tools

#### 1. Stateful Tool (Counter)

A simple tool that maintains internal state across calls using the `@Tool` decorator and `ToolInterface`:

```typescript
@Tool({
  config: {
    description: 'Counter tool.',
  },
})
export class CounterTool implements ToolInterface {
  count: number = 0;

  async execute(): Promise<ToolResult> {
    this.count++;
    return Promise.resolve({
      data: this.count,
    });
  }
}
```

#### 2. Tool with Input Schema and Dependency Injection

A tool that accepts typed arguments via `@Input` and uses NestJS dependency injection for services:

```typescript
@Tool({
  config: {
    description: 'Math tool calculating the sum of two arguments by using an injected service.',
  },
})
export class MathSumTool implements ToolInterface {
  @Inject()
  private mathService: MathService;

  @Input({
    schema: z
      .object({
        a: z.number(),
        b: z.number(),
      })
      .strict(),
  })
  args: MathSumArgs;

  async execute(args: MathSumArgs): Promise<ToolResult<number>> {
    const sum = this.mathService.sum(args.a, args.b);
    return Promise.resolve({
      data: sum,
    });
  }
}
```

The injected `MathService` is a standard NestJS injectable:

```typescript
@Injectable()
export class MathService {
  public sum(a: number, b: number) {
    return a + b;
  }
}
```

### Workflow Class

The workflow class declares input, state, output, tools, and helpers:

```typescript
@Workflow({
  configFile: __dirname + '/custom-tool-example.workflow.yaml',
})
export class CustomToolExampleWorkflow {
  @InjectTool() private counterTool: CounterTool;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectTool() private mathTool: MathSumTool;

  @Input({
    schema: z
      .object({
        a: z.number().default(1),
        b: z.number().default(2),
      })
      .strict(),
  })
  args: { a: number; b: number };

  @State({
    schema: z
      .object({
        total: z.number().optional(),
        count1: z.number().optional(),
        count2: z.number().optional(),
        count3: z.number().optional(),
      })
      .strict(),
  })
  state: { total?: number; count1?: number; count2?: number; count3?: number };

  @Output()
  result() {
    return { total: this.state.total };
  }

  @DefineHelper()
  sum(a: number, b: number) {
    return a + b;
  }
}
```

### Workflow YAML

#### Using Custom Tools

Call custom tools and save their results to state using `assign`:

```yaml
- id: calculation
  tool: mathTool
  args:
    a: ${{ args.a }}
    b: ${{ args.b }}
  assign:
    total: ${{ result.data }}
```

#### Accessing State and Arguments

Reference workflow arguments with `args.<name>` and state with `state.<name>`:

```yaml
- tool: createChatMessage
  args:
    role: 'assistant'
    content: |
      Tool calculation result:
      {{ args.a }} + {{ args.b }} = {{ state.total }}
```

#### Using Helper Functions

Call workflow helpers in templates:

```yaml
- tool: createChatMessage
  args:
    role: 'assistant'
    content: |
      Alternatively, using workflow getter function:
      {{ args.a }} + {{ args.b }} = {{ sum args.a args.b }}
```

#### Stateful Tool Behavior

The counter tool increments on each call, demonstrating stateful tools:

```yaml
- id: count1
  tool: counterTool
  assign:
    count1: ${{ result.data }}
- id: count2
  tool: counterTool
  assign:
    count2: ${{ result.data }}
- id: count3
  tool: counterTool
  assign:
    count3: ${{ result.data }}
- tool: createChatMessage
  args:
    role: 'assistant'
    content: |
      Counter tool should count:

      {{ state.count1 }}, {{ state.count2 }}, {{ state.count3 }}
```

### Workflow Output

The `@Output()` decorator defines the data returned when the workflow completes:

```typescript
@Output()
result() {
  return { total: this.state.total };
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/create-chat-message-tool` - Provides `CreateChatMessage` tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
