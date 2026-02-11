# @loopstack/workflow-state-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to interact with custom state in a workflow.

## Overview

The Workflow State Example Workflow shows how to define, assign, and access custom state properties within a workflow. It demonstrates the core patterns for managing data flow between transitions.

By using this workflow as a reference, you'll learn how to:

- Define custom state schemas using `@State` and Zod
- Assign tool results to state properties using `assign`
- Access state properties in templates using `state.<name>`
- Access tool results via `runtime.tools.<transitionId>.<toolCallId>.data`
- Create helper functions to transform state data

This example is useful for developers building workflows that need to store and manipulate data across transitions.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/workflow-state-example-workflow
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/workflow-state-example-workflow
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `WorkflowStateExampleModule` to the imports of `default.module.ts` or any other custom module.
- Inject the `WorkflowStateWorkflow` workflow to your workspace class using the `@InjectWorkflow()` decorator.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

## How It Works

### Key Concepts

#### 1. Defining State Schema

Use the `@State` decorator with a Zod schema to define custom state properties:

```typescript
@Workflow({
  configFile: __dirname + '/workflow-state.workflow.yaml',
})
export class WorkflowStateWorkflow {
  @State({
    schema: z.object({
      message: z.string().optional(),
    }),
  })
  state: { message: string };

  @Runtime()
  runtime: {
    tools: RuntimeToolResult;
  };
  // ...
}
```

#### 2. Assigning Values to State

Use `assign` to save tool results to state properties. Give the tool call an `id` so it can also be referenced via `runtime`:

```yaml
- id: create_some_data
  from: start
  to: end
  call:
    - id: say_hello
      tool: createValue
      args:
        input: 'Hello :)'
      assign:
        message: ${{ result.data }}
```

The `result.data` contains the output of the tool, which gets stored in the `message` state property.

#### 3. Accessing Data via Runtime

Access tool results directly through the `runtime` object using the pattern `runtime.tools.<transitionId>.<toolCallId>.data`:

```yaml
- tool: createChatMessage
  args:
    role: 'assistant'
    content: 'Data from runtime: {{ runtime.tools.create_some_data.say_hello.data }}'
```

#### 4. Accessing State in Templates

Reference state properties using `state.<name>` in templates:

```yaml
- tool: createChatMessage
  args:
    role: 'assistant'
    content: 'Data from state: {{ state.message }}'
```

#### 5. Using Helper Functions with State

Define helper functions to transform state data:

```typescript
@DefineHelper()
messageInUpperCase(message: string) {
  return message?.toUpperCase();
}
```

Use helpers in templates, passing state values:

```yaml
- tool: createChatMessage
  args:
    role: 'assistant'
    content: 'Use workflow helper method: {{ messageInUpperCase state.message }}'
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/create-chat-message-tool` - Provides `CreateChatMessage` tool
- `@loopstack/create-value-tool` - Provides `CreateValue` tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
