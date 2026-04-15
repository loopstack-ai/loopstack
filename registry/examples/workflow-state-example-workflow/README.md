# @loopstack/workflow-state-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to manage state across transitions using instance properties.

## Overview

The Workflow State Example Workflow shows how to store data as instance properties and access it across transitions. It demonstrates the core patterns for managing data flow in a workflow.

By using this workflow as a reference, you'll learn how to:

- Store tool results as workflow instance properties
- Access instance properties in subsequent transitions
- Create private helper methods to transform stored data
- Use `@InjectTool()` to declare and call tools

This example is useful for developers building workflows that need to store and manipulate data across transitions.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Key Concepts

#### 1. Defining Workflow State

State is stored as instance properties on the workflow class. No special decorator is needed -- just declare properties on your class:

```typescript
@Workflow({
  uiConfig: __dirname + '/workflow-state.ui.yaml',
})
export class WorkflowStateWorkflow extends BaseWorkflow {
  message?: string;
}
```

The `message` property is a plain instance property that persists across transitions automatically.

#### 2. Storing Data in State

Assign values to instance properties inside a transition method:

```typescript
@Initial({ to: 'data_created' })
async createSomeData() {
  this.message = 'Hello :)';
}
```

The value is stored in `this.message` for use in later transitions.

#### 3. Accessing State in Later Transitions

Instance properties are available in any subsequent transition method:

```typescript
@Final({ from: 'data_created' })
async showResults() {
  await this.createChatMessage.call({
    role: 'assistant',
    content: `Data from state: ${this.message}`,
  });

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Use workflow helper method: ${this.messageInUpperCase(this.message!)}`,
  });
}
```

#### 4. Private Helper Methods

Define private methods to transform or process state data:

```typescript
private messageInUpperCase(message: string): string {
  return message?.toUpperCase();
}
```

These are standard TypeScript methods with no decorator required. Call them from any transition using `this.messageInUpperCase(...)`.

### Complete Workflow

```typescript
import { BaseWorkflow, Final, Initial, Workflow } from '@loopstack/common';
import { MessageDocument } from '@loopstack/core';

@Workflow({
  uiConfig: __dirname + '/workflow-state.ui.yaml',
})
export class WorkflowStateWorkflow extends BaseWorkflow {
  message?: string;

  @Initial({ to: 'data_created' })
  async createSomeData() {
    this.message = 'Hello :)';
  }

  @Final({ from: 'data_created' })
  async showResults() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Data from state: ${this.message}`,
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Use workflow helper method: ${this.messageInUpperCase(this.message!)}`,
    });
  }

  private messageInUpperCase(message: string): string {
    return message?.toUpperCase();
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Base classes, decorators, and tool injection
- `@loopstack/core` - Provides `MessageDocument` for chat messages

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
