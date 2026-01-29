# @loopstack/accessing-tool-results-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating different methods for accessing tool results within and across workflow transitions.

## Overview

The Tool Results Example Workflow shows how to retrieve and use data returned by tools in subsequent workflow steps. Understanding these patterns is essential for building workflows that pass data between operations.

By using this workflow as a reference, you'll learn how to:

- Access tool results using call IDs
- Access tool results using call indices
- Retrieve data from previous transitions
- Create custom helper functions for data extraction

This example is useful for developers learning to build data-driven workflows that need to pass information between steps.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/accessing-tool-results-example-workflow
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/accessing-tool-results-example-workflow
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `AccessingToolResultsExampleModule` to the imports of `default.module.ts` or any other custom module.
- Inject the `WorkflowToolResultsWorkflow` workflow to your workspace class using the `@Workflow()` decorator.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

## How It Works

### Accessing Tool Results

#### 1. Using Call IDs

Assign a unique `id` to a tool call, then reference it via `metadata.tools.<transition_id>.<call_id>.data`:

```yaml
- id: say_hello
  tool: createValue
  args:
    input: 'Hello World.'

- tool: createChatMessage
  args:
    content: '{{ metadata.tools.create_some_data.say_hello.data }}'
```

#### 2. Using Call Indices

Access tool results by their position (zero-indexed) within the transition:

```yaml
- tool: createChatMessage
  args:
    content: '{{ metadata.tools.create_some_data.0.data }}'
```

#### 3. Across Transitions

Tool results persist and can be accessed from subsequent transitions using the same patterns:

```yaml
# In a later transition
- tool: createChatMessage
  args:
    content: '{{ metadata.tools.create_some_data.say_hello.data }}'
```

#### 4. Using Helper Functions

Define custom helper functions in your workflow class for complex data extraction:

```typescript
@Helper()
extractMessage(metadata: WorkflowMetadataInterface): string {
  return metadata.tools.create_some_data.say_hello.data;
}
```

Then use them in your YAML configuration:

```yaml
- tool: createChatMessage
  args:
    content: '{{ extractMessage metadata }}'
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/core-ui-module` - Provides `CreateChatMessage` tool
- `@loopstack/create-value-tool` - Provides `CreateValue` tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
