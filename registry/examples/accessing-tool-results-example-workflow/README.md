# @loopstack/accessing-tool-results-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating different methods for accessing tool results within and across workflow transitions.

## Overview

The Tool Results Example Workflow shows how to retrieve and use data returned by tools in subsequent workflow steps. Understanding these patterns is essential for building workflows that pass data between operations.

By using this workflow as a reference, you'll learn how to:

- Access tool results using call IDs via `runtime.tools`
- Access tool results using call indices
- Retrieve data from previous transitions
- Create custom helper functions that access `runtime` for data extraction

This example is useful for developers learning to build data-driven workflows that need to pass information between steps.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Workflow Class

The workflow declares tools, typed runtime, and a helper function:

```typescript
@Workflow({
  configFile: __dirname + '/workflow-tool-results.workflow.yaml',
})
export class WorkflowToolResultsWorkflow {
  @InjectTool() private createValue: CreateValue;
  @InjectTool() private createChatMessage: CreateChatMessage;

  @Runtime()
  runtime: {
    tools: {
      create_some_data: {
        say_hello: {
          data: string;
        };
      };
    };
  };

  @DefineHelper()
  theMessage(): string {
    return this.runtime.tools.create_some_data.say_hello.data;
  }
}
```

### Accessing Tool Results

#### 1. Using Call IDs

Assign a unique `id` to a tool call, then reference it via `runtime.tools.<transition_id>.<call_id>.data`:

```yaml
- id: say_hello
  tool: createValue
  args:
    input: 'Hello World.'

- tool: createChatMessage
  args:
    role: 'assistant'
    content: 'Data from specific call id: {{ runtime.tools.create_some_data.say_hello.data }}'
```

#### 2. Using Call Indices

Access tool results by their position (zero-indexed) within the transition:

```yaml
- tool: createChatMessage
  args:
    role: 'assistant'
    content: 'Data from first tool call: {{ runtime.tools.create_some_data.0.data }}'
```

#### 3. Across Transitions

Tool results persist and can be accessed from subsequent transitions using the same `runtime.tools` patterns:

```yaml
# In a later transition
- id: access_data
  from: data_created
  to: end
  call:
    - tool: createChatMessage
      args:
        role: 'assistant'
        content: 'Data from previous transition: {{ runtime.tools.create_some_data.say_hello.data }}'
```

#### 4. Using Helper Functions

Define custom helper functions in your workflow class that access `this.runtime` directly:

```typescript
@DefineHelper()
theMessage(): string {
  return this.runtime.tools.create_some_data.say_hello.data;
}
```

Then use them in your YAML configuration (no arguments needed):

```yaml
- tool: createChatMessage
  args:
    role: 'assistant'
    content: 'Data access using custom helper: {{ theMessage }}'
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
