# @loopstack/dynamic-routing-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to implement conditional routing based on runtime values.

## Overview

The Dynamic Routing Example Workflow shows how to create branching logic in workflows using the `if` condition on transitions. It demonstrates how to route execution through different paths based on input values.

By using this workflow as a reference, you'll learn how to:

- Define conditional transitions using the `if` property
- Create helper functions for custom comparison logic
- Build multi-level branching structures
- Implement fallback routes when conditions aren't met

This example is useful for developers building workflows that require decision trees, validation flows, or any logic that branches based on data.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/dynamic-routing-example-workflow
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/dynamic-routing-example-workflow
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `DynamicRoutingExampleModule` to the imports of `default.module.ts` or any other custom module.
- Inject the `DynamicRoutingExampleWorkflow` workflow to your workspace class using the `@InjectWorkflow()` decorator.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

## How It Works

### Key Concepts

#### 1. Workflow Arguments

The workflow accepts a numeric input value with a default:

```typescript
@WithArguments(
  z.object({
    value: z.number().default(150),
  }).strict(),
)
```

#### 2. Conditional Transitions

Use the `if` property to define conditions for transitions. The first matching transition is taken:

```yaml
- id: route-to-place-A
  from: prepared
  to: placeA
  if: '{{ gt args.value 100 }}'

- id: route-to-place-B
  from: prepared
  to: placeB
  # No condition = fallback route
```

#### 3. Helper Functions for Conditions

Define custom helper functions in your workflow class for comparison logic:

```typescript
@DefineHelper()
gt(a: number, b: number) {
  return a > b;
}
```

Use them in YAML with Handlebars syntax:

```yaml
if: '{{ gt args.value 100 }}'
```

#### 4. Multi-Level Branching

Chain conditional transitions to create decision trees:

```yaml
# First level: value > 100?
- id: route-to-place-A
  from: prepared
  to: placeA
  if: '{{ gt args.value 100 }}'

# Second level: value > 200?
- id: route-to-place-C
  from: placeA
  to: placeC
  if: '{{ gt args.value 200 }}'

- id: route-to-place-D
  from: placeA
  to: placeD
  # Fallback for 100 < value <= 200
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
