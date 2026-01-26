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

### Add the Module

```bash
loopstack add @loopstack/accessing-tool-results-example-workflow
```

This copies the source files into your `src` directory.

> Using the `loopstack add` command is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `AccessingToolResultsExampleModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { AccessingToolResultsExampleModule } from './accessing-tool-results-example-workflow';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule, CoreUiModule, AccessingToolResultsExampleModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Register in Your Workspace

Add the workflow to your workspace class using the `@Workflow()` decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { BlockConfig, Workflow } from '@loopstack/common';
import { WorkspaceBase } from '@loopstack/core';
import { WorkflowToolResultsWorkflow } from './accessing-tool-results-example-workflow';

@Injectable()
@BlockConfig({
  config: {
    title: 'My Workspace',
    description: 'A workspace with the tool results example workflow',
  },
})
export class MyWorkspace extends WorkspaceBase {
  @Workflow() workflowToolResults: WorkflowToolResultsWorkflow;
}
```

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
