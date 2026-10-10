---
title: Local File Explorer Examples
description: Local file explorer workflow example for Loopstack — build a file tree of the workspace with FileSystemService from @loopstack/local-file-explorer-module.
---

# Local File Explorer Examples

> Local file explorer workflow example for the [Loopstack](https://loopstack.ai) automation framework.

Shows how a workflow reads the local disk with `FileSystemService` from `@loopstack/local-file-explorer-module`. The same module also lights up the Studio file panel and exposes a REST API for it. Reach for this when a workflow needs to inspect files on the machine the app runs on.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/common @loopstack/local-file-explorer-module
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { LocalFileExplorerExamplesModule } from './local-file-explorer/local-file-explorer-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), LocalFileExplorerExamplesModule],
})
export class AppModule {}
```

## Environment

None — the workflow reads the local disk. No Docker, remote agent or secrets are required.

## Examples

| Example                                     | Studio title                              | Description                                          |
| ------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| [Local File Explorer](#local-file-explorer) | `Local File Explorer - File Tree Example` | Build a workspace file tree with `FileSystemService` |

---

## Local File Explorer

Calls `FileSystemService.buildFileTree()` on the app's working directory and renders the top-level entries (up to 50) as a markdown document.

Run it from Studio (**Local File Explorer Examples → Local File Explorer - File Tree Example**) or the CLI:

```bash
loopstack run local_file_explorer_example
```

### Files

- `local-file-explorer-example.workflow.ts` — workflow class

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
