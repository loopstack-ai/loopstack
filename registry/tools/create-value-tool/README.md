# @loopstack/create-value-tool

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a tool for creating and debugging values in Loopstack workflows with built-in logging and flexible type support.

## Overview

The Create Value Tool enables workflows to create, transform, and debug values during execution. It accepts any valid JSON-compatible value type and returns it, making it invaluable for debugging template expressions and reassigning values.

By using this tool, you'll be able to:

- Debug template expressions by logging their evaluated results
- Initialize workflow state variables with computed values
- Transform and reassign values using template expressions
- Verify data structures at any point in your workflow
- Support all JSON-compatible types (strings, numbers, objects, arrays, booleans, null)

This tool is essential for workflows that need to debug complex expressions, initialize context variables, or transform data between workflow steps.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## Usage

Inject the tool in your workflow class using the `@InjectTool()` decorator:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, ToolResult, Workflow } from '@loopstack/common';
import { CreateValue } from '@loopstack/create-value-tool';

@Workflow({
  uiConfig: __dirname + '/my.ui.yaml',
  schema: z
    .object({
      userId: z.string(),
    })
    .strict(),
})
export class MyWorkflow extends BaseWorkflow<{ userId: string }> {
  @InjectTool() createValue: CreateValue;

  config?: Record<string, unknown>;

  @Initial({ to: 'processed' })
  async initialize(args: { userId: string }) {
    // Debug a value
    await this.createValue.call({ input: args.userId });

    // Create a complex object
    const result: ToolResult = await this.createValue.call({
      input: {
        environment: 'production',
        timeout: 30,
        retries: 3,
        endpoints: ['https://api.example.com', 'https://backup.example.com'],
      },
    });

    this.config = result.data as Record<string, unknown>;
  }

  @Final({ from: 'processed' })
  async done() {
    // Use the config value
  }
}
```

## About

Author: Jakob Klippel

License: Apache-2.0

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples how to use this tool look for `@loopstack/create-value-tool` in the [Loopstack Registry](https://loopstack.ai/registry)
