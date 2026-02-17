# @loopstack/dynamic-routing-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to implement conditional routing based on runtime values.

## Overview

The Dynamic Routing Example Workflow shows how to create branching logic in workflows using the `if` condition on transitions. It demonstrates how to route execution through different paths based on input values.

By using this workflow as a reference, you'll learn how to:

- Define conditional transitions using the `if` property with expression syntax
- Build multi-level branching structures
- Implement fallback routes when conditions aren't met
- Use `@Input` for workflow arguments with UI form configuration

This example is useful for developers building workflows that require decision trees, validation flows, or any logic that branches based on data.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Workflow Class

The workflow class declares input arguments using `@Input`:

```typescript
@Workflow({
  configFile: __dirname + '/dynamic-routing-example.workflow.yaml',
})
export class DynamicRoutingExampleWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;

  @Input({
    schema: z
      .object({
        value: z.number().default(150),
      })
      .strict(),
  })
  args: {
    value: number;
  };
}
```

### Key Concepts

#### 1. Conditional Transitions

Use the `if` property with expression syntax (`${{ }}`) to define conditions for transitions. The first matching transition from a given state is taken:

```yaml
- id: route-to-place-A
  from: prepared
  to: placeA
  if: ${{ args.value > 100 }}

- id: route-to-place-B
  from: prepared
  to: placeB
  # No condition = fallback route
```

The expression syntax `${{ }}` supports JavaScript-like comparison operators (`>`, `<`, `>=`, `<=`, `==`, etc.) directly, without needing helper functions.

#### 2. Multi-Level Branching

Chain conditional transitions to create decision trees:

```yaml
# First level: value > 100?
- id: route-to-place-A
  from: prepared
  to: placeA
  if: ${{ args.value > 100 }}

- id: route-to-place-B
  from: prepared
  to: placeB
  # Fallback: value <= 100

# Second level: value > 200?
- id: route-to-place-C
  from: placeA
  to: placeC
  if: ${{ args.value > 200 }}

- id: route-to-place-D
  from: placeA
  to: placeD
  # Fallback: 100 < value <= 200
```

#### 3. UI Form Configuration

Configure the input form in YAML:

```yaml
ui:
  form:
    properties:
      value:
        title: 'A number between 0 and 300'
```

#### 4. Complete Routing Flow

The workflow routes through different states based on the input value:

- **value <= 100** -> placeB -> "Value is less or equal 100"
- **100 < value <= 200** -> placeA -> placeD -> "Value is less or equal 200, but greater than 100"
- **value > 200** -> placeA -> placeC -> "Value is greater than 200"

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
