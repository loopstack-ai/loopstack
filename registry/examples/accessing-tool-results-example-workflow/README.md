# @loopstack/accessing-tool-results-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating different methods for accessing tool results within and across workflow transitions.

## Overview

The Tool Results Example Workflow shows how to retrieve and use data returned by tools in subsequent workflow steps. Understanding these patterns is essential for building workflows that pass data between operations.

By using this workflow as a reference, you'll learn how to:

- Call tools using `@InjectTool()` and access their return values directly
- Store tool results as workflow instance properties for use across transitions
- Access stored data in later transitions via instance properties
- Create private helper methods to encapsulate data access logic

This example is useful for developers learning to build data-driven workflows that need to pass information between steps.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Workflow Class

The workflow extends `BaseWorkflow` and declares tools via `@InjectTool()`. Tool results are stored as instance properties and accessed across transitions:

```typescript
@Workflow({
  uiConfig: __dirname + '/workflow-tool-results.ui.yaml',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow {
  @InjectTool() private createValue: CreateValue;
  @InjectTool() private createChatMessage: CreateChatMessage;

  storedMessage?: string;
}
```

### Key Concepts

#### 1. Calling Tools and Storing Results

In a transition method, call a tool with `this.tool.call(args)` and store the result as an instance property:

```typescript
@Initial({ to: 'data_created' })
async createSomeData() {
  const result = await this.createValue.call({ input: 'Hello World.' });
  this.storedMessage = result.data as string;

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Data from specific call id: ${this.storedMessage}`,
  });

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Data from first tool call: ${this.storedMessage}`,
  });
}
```

The `createValue` tool returns a `ToolResult` object with a `data` property containing the output. This value is stored in `this.storedMessage` for later use.

#### 2. Accessing Data Across Transitions

Instance properties persist across transitions. In a subsequent `@Final` method, the stored data is still available:

```typescript
@Final({ from: 'data_created' })
async accessData() {
  await this.createChatMessage.call({
    role: 'assistant',
    content: `Data from previous transition: ${this.storedMessage}`,
  });

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Data access using custom helper: ${this.theMessage()}`,
  });
}
```

#### 3. Private Helper Methods

Define private methods on the workflow class to encapsulate data access logic:

```typescript
private theMessage(): string {
  return this.storedMessage!;
}
```

These are standard TypeScript methods -- no decorator needed. Call them from any transition method using `this.theMessage()`.

### Complete Workflow

```typescript
import { BaseWorkflow, Final, Initial, InjectTool, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { CreateValue } from '@loopstack/create-value-tool';

@Workflow({
  uiConfig: __dirname + '/workflow-tool-results.ui.yaml',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow {
  @InjectTool() private createValue: CreateValue;
  @InjectTool() private createChatMessage: CreateChatMessage;

  storedMessage?: string;

  @Initial({ to: 'data_created' })
  async createSomeData() {
    const result = await this.createValue.call({ input: 'Hello World.' });
    this.storedMessage = result.data as string;

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Data from specific call id: ${this.storedMessage}`,
    });

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Data from first tool call: ${this.storedMessage}`,
    });
  }

  @Final({ from: 'data_created' })
  async accessData() {
    await this.createChatMessage.call({
      role: 'assistant',
      content: `Data from previous transition: ${this.storedMessage}`,
    });

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Data access using custom helper: ${this.theMessage()}`,
    });
  }

  private theMessage(): string {
    return this.storedMessage!;
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Base classes, decorators, and tool injection
- `@loopstack/create-chat-message-tool` - Provides `CreateChatMessage` tool
- `@loopstack/create-value-tool` - Provides `CreateValue` tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
