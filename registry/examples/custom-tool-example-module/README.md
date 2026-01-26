
# @loopstack/custom-tool-example-module
> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a complete example demonstrating how to implement and use custom tools in a Loopstack workflow.

## Overview

Custom tools are the building blocks of Loopstack automations. This module serves as a hands-on reference for developers learning how to extend Loopstack with their own functionality.

By exploring this example, you'll understand:

- How to create tools that perform specific tasks within workflows
- The difference between stateless and stateful tools
- How to use dependency injection to keep tools modular and testable
- How to wire tools into workflows using YAML configuration
- How to structure and export a reusable module

This is a great starting point before building your own custom tools.

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
loopstack add @loopstack/custom-tool-example-module
```

This copies the source files into your `src` directory. 

> Using the `loopstack add` command is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `CustomToolModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { DefaultWorkspace } from './default.workspace';
import { CustomToolModule } from './custom-tool-example-module';

@Module({
  imports: [LoopCoreModule, CustomToolModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Register the Workflow

Add the workflow to your `default.workspace.ts` or your own workspace:

```typescript
import { WorkspaceBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';
import { BlockConfig, Workflow } from '@loopstack/common';
import { CustomToolExampleWorkflow } from './custom-tool-example-module/workflows';

@Injectable()
@BlockConfig({
  config: {
    title: 'Default Workspace',
  },
})
export class DefaultWorkspace extends WorkspaceBase {
  @Workflow() customToolExample: CustomToolExampleWorkflow;
}
```

### 3. Run Backend

```bash
npm run start:dev
```

Open [localhost:3000](http://localhost:3000) and execute the workflow in the Loopstack Studio.