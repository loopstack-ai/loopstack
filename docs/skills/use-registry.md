---
title: 'Skill: Use the Loopstack Registry'
description: Instructions for AI agents to discover, install, and integrate @loopstack/* registry packages via npm, and to read and copy example workflows from the examples app.
---

# Skill: Use the Loopstack Registry

## Overview

The Loopstack Registry is a collection of `@loopstack/*` packages providing pre-built tools, workflows and modules. Always check the registry before building a custom tool or workflow — the functionality you need may already exist.

Every registry package is a NestJS module you import as a dependency (LLM providers, OAuth, Docker sandboxes, HITL, git, MCP, etc.): `npm install @loopstack/<name>`. The package lives at `registry/<name>` in the Loopstack repository and is documented at `https://loopstack.ai/docs/registry/<name>`.

Example workflows are not registry packages. They live in one app in the Loopstack repository and are
meant to be read and copied — see [Using an Example](#using-an-example).

## Discovering Packages

Browse the registry at `https://loopstack.ai/docs/registry`.

## Installing a Package

```bash
npm install @loopstack/<name>
```

Then import its module in your app:

```typescript
import { Module } from '@nestjs/common';
import { MyModule } from '@loopstack/<name>';

@Module({
  imports: [MyModule],
})
export class AppModule {}
```

The module's exports — tools, services, documents — become available for constructor injection in your workflows.

## Using an Example

Every example lives in one app, `examples/`, in the Loopstack repository — one module per theme under
`examples/src/`. Clone it once to read and run all of them:

```bash
npx giget@latest gh:loopstack-ai/loopstack/examples loopstack-examples
cd loopstack-examples && npm install && npm run build && npm start
```

Examples are meant to be read, copied and adapted. To take one into your own project, copy its module
directory and install what it imports — each module's README names the exact packages:

```bash
cp -r loopstack-examples/src/hitl src/hitl
npm install @loopstack/agent @loopstack/claude @loopstack/common @loopstack/hitl @loopstack/llm-provider
```

Then register the module like any local NestJS module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { HitlExamplesModule } from './hitl/hitl-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), HitlExamplesModule],
})
export class AppModule {}
```

## Inspecting a Package Before Committing

To explore a registry package without adding it to the project, install it in a temporary directory:

```bash
mkdir -p /tmp/loopstack-inspect && cd /tmp/loopstack-inspect
npm init -y && npm install @loopstack/<name>
```

Review `node_modules/@loopstack/<name>/README.md` and `src/` to verify the package does what you need.

The source of a package or a single example module can also be fetched straight into `/tmp`:

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/<name> /tmp/<name>
npx giget@latest gh:loopstack-ai/loopstack/examples/src/<module-name> /tmp/<module-name>
```

## Reading Source Code

When in doubt about a tool's behavior — its input schema, return type, or side effects — read the source directly.

For packages installed via npm:

```
node_modules/@loopstack/<name>/src/tools/<tool-name>.tool.ts
```

For an example module you copied, the source lives wherever you put it (e.g. `src/<module-name>/`).

Look for:

- `@Tool({ name, description, schema })` — the name, description (seen by LLMs), and Zod schema for accepted arguments
- `handle()` method — the actual implementation
- `ToolEnvelope` return — what data comes back (workflow callers see the narrowed `ToolResult` after `tool.call()` throws on `error` / `pending`)
