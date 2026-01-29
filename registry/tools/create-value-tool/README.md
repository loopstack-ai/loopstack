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

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add`

```bash
loopstack add @loopstack/create-value-tool
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`(recommended)

```bash
npm install --save @loopstack/create-value-tool
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `CreateValueModule` to the imports of `default.module.ts` or any other custom module.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

### 2. Use in Your Workflow

Inject the tool in your workflow class using the @Tool() decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, Tool, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { CreateValue } from './create-value-tool';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/my.workflow.yaml',
})
@WithState(
  z.object({
    config: z.any().optional(),
  }),
)
export class MyWorkflow extends WorkflowBase {
  @Tool() createValue: CreateValue;
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
          input: ${ args.userId }

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
          config: ${ result.data }
```

## About

Author: Jakob Klippel

License: Apache-2.0

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai)
- [Getting Started with Loopstack](https://loopstack.ai)
- For more examples how to use this tool look for `@loopstack/create-value-tool` in the [Loopstack Registry](https://loopstack.ai/registry)
