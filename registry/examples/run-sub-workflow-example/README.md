# @loopstack/run-sub-workflow-example

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example demonstrating how to execute child workflows from within a parent workflow for hierarchical workflow composition.

## Overview

The Run Sub Workflow Example shows how to build workflows that spawn and manage child workflows asynchronously. It demonstrates a parent workflow that starts a sub-workflow, tracks its completion status through a callback mechanism, and receives result data from the child workflow.

By using this example as a reference, you'll learn how to:

- Use `ExecuteWorkflowAsync` to start child workflows asynchronously
- Set up callback transitions to handle sub-workflow completion
- Define workflow results using `@Output` and `getResult()`
- Access child workflow results via `transition.payload` in the callback
- Hide sub-workflows from direct execution using `visible: false`
- Display real-time status updates using the `LinkDocument`
- Compose complex workflows from smaller, reusable workflow components

This example is essential for developers building workflows that need to orchestrate multiple workflow executions or break down complex processes into manageable sub-workflows.

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
loopstack add @loopstack/run-sub-workflow-example
```

This copies the source files into your `src` directory.

> Using the `loopstack add` command is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `RunSubWorkflowExampleModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { RunSubWorkflowExampleModule } from './@loopstack/run-sub-workflow-example';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule, RunSubWorkflowExampleModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Register in Your Workspace

Add the workflows to your workspace class using the `@Workflow()` decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { BlockConfig, Workflow } from '@loopstack/common';
import { WorkspaceBase } from '@loopstack/core';
import {
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleSubWorkflow,
} from './@loopstack/run-sub-workflow-example';

@Injectable()
@BlockConfig({
  config: {
    title: 'My Workspace',
    description: 'A workspace with the run sub workflow example',
  },
})
export class MyWorkspace extends WorkspaceBase {
  @Workflow() runSubWorkflowExampleParentWorkflow: RunSubWorkflowExampleParentWorkflow;
  @Workflow({ options: { visible: false } }) runSubWorkflowExampleSubWorkflow: RunSubWorkflowExampleSubWorkflow;
}
```

## How It Works

### Key Concepts

#### 1. Parent Workflow Structure

The parent workflow uses `ExecuteWorkflowAsync` to start a child workflow and sets up a callback transition:

```typescript
@Injectable()
@Workflow({
  configFile: __dirname + '/run-sub-workflow-example-parent.workflow.yaml',
})
export class RunSubWorkflowExampleParentWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectTool() private executeWorkflowAsync: ExecuteWorkflowAsync;
  @InjectTool() private createDocument: CreateDocument;

  @InjectDocument() private linkDocument: LinkDocument;
}
```

#### 2. Executing a Sub-Workflow Asynchronously

Use `executeWorkflowAsync` to spawn a child workflow with a callback:

```yaml
- tool: executeWorkflowAsync
  id: job
  args:
    workflow: runSubWorkflowExampleSubWorkflow
    args: {}
    callback:
      transition: sub_workflow_callback
```

The `callback.transition` specifies which transition will be triggered when the sub-workflow completes.

#### 3. Displaying Status with LinkDocument

Use `LinkDocument` to display a link to the sub workflow and status updates:

```yaml
- tool: createDocument
  args:
    document: linkDocument
    id: subWorkflow_link
    update:
      content:
        icon: 'Clock'
        label: 'Executing Sub-Workflow...'
        href: '/pipelines/{{ metadata.tools.run_workflow.job.data.task.payload.id }}'
```

#### 4. Defining Workflow Results

Sub-workflows can return structured results using `@Output` and `getResult()`:

```typescript
@Injectable()
@Workflow({
  configFile: __dirname + '/run-sub-workflow-example-sub.workflow.yaml',
})
export class RunSubWorkflowExampleSubWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;

  @Output({
    schema: z.object({
      message: z.string(),
    }),
  })
  getResult(): any {
    return {
      message: 'Hi mom!',
    };
  }
}
```

The `@Output` decorator on `getResult()` defines the schema for the workflow's output, and the method returns the actual data when the workflow completes.

#### 5. Handling the Callback and Accessing Results

Define a callback transition that fires when the sub-workflow completes. Access the child workflow's result via `transition.payload`:

```yaml
- id: sub_workflow_callback
  from: sub_workflow_started
  to: end
  trigger: manual
  call:
    - tool: createDocument
      args:
        document: linkDocument
        id: subWorkflow_link
        update:
          content:
            icon: 'CircleCheck'
            label: 'Sub-Workflow completed'
            href: '/pipelines/{{ metadata.tools.run_workflow.job.data.task.payload.id }}'

    - tool: createChatMessage
      args:
        role: 'assistant'
        content: |
          A message from the child workflow:

          {{ transition.payload.message }}
```

The `trigger: manual` ensures this transition only fires when called by the callback, not automatically. The `transition.payload` contains the result returned by the child workflow's `getResult()` method, decorated with `@Output`.

#### 6. Hiding Sub-Workflows from Direct Execution

Sub-workflows that should only be executed by a parent workflow can be hidden from the Loopstack Studio UI using the `visible: false` option:

```typescript
@Workflow({ options: { visible: false } }) runSubWorkflowExampleSubWorkflow: RunSubWorkflowExampleSubWorkflow;
```

When `visible: false` is set, the workflow will not appear in the Loopstack Studio for direct execution. It can only be triggered programmatically by another workflow using `executeWorkflowAsync`. This is useful for helper workflows that are not meant to be run standalone.

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality including `ExecuteWorkflowAsync`
- `@loopstack/core-ui-module` - Provides `CreateDocument` tool and `LinkDocument`
- `@loopstack/create-chat-message-tool` - Provides `CreateChatMessage` tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
