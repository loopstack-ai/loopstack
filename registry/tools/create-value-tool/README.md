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

Inject the tool in your workflow class using the @InjectTool() decorator:

```typescript
import { z } from 'zod';
import { InjectTool, State, Workflow } from '@loopstack/common';
import { CreateValue } from './create-value-tool';

@Workflow({
  configFile: __dirname + '/my.workflow.yaml',
})
export class MyWorkflow {
  @InjectTool() createValue: CreateValue;

  @State({
    schema: z.object({
      config: z.any().optional(),
    }),
  })
  state: { config: any };
}
```

And use it in your YAML workflow configuration:

```yaml
# src/my.workflow.yaml
transitions:
  # Debug a template expression
  - id: debug_expression
    from: start
    to: process
    call:
      - tool: createValue
        args:
          input: ${{ args.userId }}

  # Initialize a complex object
  - id: create_config
    from: start
    to: process
    call:
      - tool: createValue
        args:
          input:
            environment: production
            timeout: 30
            retries: 3
            endpoints:
              - https://api.example.com
              - https://backup.example.com
        assign:
          config: ${{ result.data }}
```

## About

Author: Jakob Klippel

License: Apache-2.0

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai)
- [Getting Started with Loopstack](https://loopstack.ai)
- For more examples how to use this tool look for `@loopstack/create-value-tool` in the [Loopstack Registry](https://loopstack.ai/registry)
