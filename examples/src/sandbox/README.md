---
title: Sandbox Examples
description: Docker sandbox workflow example for Loopstack — init a container, run file operations inside it with the sandbox filesystem tools, and destroy it.
---

# Sandbox Examples

> Docker sandbox workflow example for the [Loopstack](https://loopstack.ai) automation framework.

Shows how a workflow runs file operations in an isolated Docker container with `@loopstack/docker-sandbox` (container lifecycle) and `@loopstack/docker-sandbox-filesystem` (file operations inside the container). Reach for this pattern when a workflow needs to execute or inspect untrusted code without touching the host.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/common @loopstack/docker-sandbox @loopstack/docker-sandbox-filesystem
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { SandboxExamplesModule } from './sandbox/sandbox-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), SandboxExamplesModule],
})
export class AppModule {}
```

## Environment

The workflow needs a Docker daemon reachable from the app (the default socket, `/var/run/docker.sock`). The app boots without one; the run fails at the first sandbox call if Docker isn't available. The `node:18` image is pulled on first use. No secrets are required.

## Examples

| Example             | Studio title                   | Description                                             |
| ------------------- | ------------------------------ | ------------------------------------------------------- |
| [Sandbox](#sandbox) | `Sandbox - Filesystem Example` | Full Docker sandbox lifecycle — init, file ops, destroy |

---

## Sandbox

Walks the complete Docker sandbox lifecycle: `sandboxInit` → directory + file operations (`sandboxCreateDirectory`, `sandboxWriteFile`, `sandboxReadFile`, `sandboxListDirectory`, `sandboxExists`, `sandboxFileInfo`, `sandboxDelete`) → `sandboxDestroy`. Each step posts a message with the tool's result.

Run it from Studio (**Sandbox Examples → Sandbox - Filesystem Example**) or the CLI:

```bash
loopstack run sandbox_example --arg outputDir=/tmp/sandbox-out
```

`outputDir` is the host directory mounted into the container (defaults to `./out`).

### Files

- `sandbox-example.workflow.ts` — workflow class

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
