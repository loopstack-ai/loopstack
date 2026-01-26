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

### Prerequisites

Create a new Loopstack project if you haven't already:

```bash
npx create-loopstack-app my-project
cd my-project
```

Start Environment

```bash
cd my-project
docker compose up -d
```

### Install the Module

#### As Node Dependency via Npm:

```bash
npm install --save @loopstack/create-value-tool
```

#### OR: Copy Sources via Loopstack CLI

```bash
loopstack add @loopstack/create-value-tool
```

> `loopstack add` copies the source files into your `src` directory. This is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `CreateValueModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { DefaultWorkspace } from './default.workspace';
import { CreateValueToolModule } from './create-value-tool';

@Module({
  imports: [LoopCoreModule, CoreUiModule, CreateValueToolModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Use in Your Workflow

Inject the tool in your workflow class using the @Tool() decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { BlockConfig, Tool, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { CreateValue } from './create-value-tool';
import { z } from 'zod';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/my.workflow.yaml',
})
@WithState(z.object({
  config: z.any().optional(),
}))
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
