# @loopstack/accessing-tool-results-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to store and access data across workflow transitions using instance properties.

## Overview

The Workflow State Example shows how to persist data between transitions using class instance properties. Understanding these patterns is essential for building workflows that pass data between operations.

By using this workflow as a reference, you'll learn how to:

- Store data as workflow instance properties for use across transitions
- Access stored data in later transitions via instance properties
- Create private helper methods to encapsulate data access logic

This example is useful for developers learning to build data-driven workflows that need to pass information between steps.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Workflow Class

The workflow extends `BaseWorkflow` and stores data as instance properties that persist across transitions:

```typescript
@Workflow({
  uiConfig: __dirname + '/workflow-tool-results.ui.yaml',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow {
  storedMessage?: string;
}
```

### Key Concepts

#### 1. Storing Data in State

In a transition method, assign values to instance properties:

```typescript
@Initial({ to: 'data_created' })
async createSomeData() {
  this.storedMessage = 'Hello World.';

  await this.repository.save(MessageDocument, {
    role: 'assistant',
    content: `Stored in initial transition: ${this.storedMessage}`,
  });
}
```

The value is stored in `this.storedMessage` for later use.

#### 2. Accessing Data Across Transitions

Instance properties persist across transitions. In a subsequent `@Final` method, the stored data is still available:

```typescript
@Final({ from: 'data_created' })
async accessData() {
  await this.repository.save(MessageDocument, {
    role: 'assistant',
    content: `Accessed from previous transition: ${this.storedMessage}`,
  });

  await this.repository.save(MessageDocument, {
    role: 'assistant',
    content: `Accessed via helper method: ${this.theMessage()}`,
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
import { BaseWorkflow, Final, Initial, Workflow } from '@loopstack/common';
import { MessageDocument } from '@loopstack/core';

@Workflow({
  uiConfig: __dirname + '/workflow-tool-results.ui.yaml',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow {
  storedMessage?: string;

  @Initial({ to: 'data_created' })
  async createSomeData() {
    this.storedMessage = 'Hello World.';

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Stored in initial transition: ${this.storedMessage}`,
    });
  }

  @Final({ from: 'data_created' })
  async accessData() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Accessed from previous transition: ${this.storedMessage}`,
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Accessed via helper method: ${this.theMessage()}`,
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
- `@loopstack/core` - Provides `MessageDocument` for chat messages

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
