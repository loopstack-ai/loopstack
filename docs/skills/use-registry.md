---
title: 'Skill: Use the Loopstack Registry'
description: Instructions for AI agents to discover, install, and integrate @loopstack/* registry packages — feature modules and tools via npm, example workflows via giget for source access.
---

# Skill: Use the Loopstack Registry

## Overview

The Loopstack Registry is a collection of `@loopstack/*` packages providing pre-built tools, feature modules, and example workflows. Always check the registry before building a custom tool or workflow — the functionality you need may already exist.

The registry has two kinds of packages, each with its own preferred install method:

| Kind         | What it is                                                                                                                     | Default install                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| **Features** | Reusable modules and tools you import as a dependency (LLM providers, OAuth, sandboxes, HITL, etc.)                            | `npm install @loopstack/<pkg>` |
| **Examples** | Starting-point workflows meant to be read, copied, and adapted. Source access is the point — you fork them into your own code. | `npx giget` from GitHub        |

## Discovering Packages

Browse the registry at `https://loopstack.ai/registry`.

## Installing a Feature Module

```bash
npm install @loopstack/<package-name>
```

Then import its module in your app:

```typescript
import { Module } from '@nestjs/common';
import { MyFeatureModule } from '@loopstack/<package-name>';

@Module({
  imports: [MyFeatureModule],
})
export class AppModule {}
```

The module's exports — tools, services, documents — become available for constructor injection in your workflows.

## Installing an Example Workflow

Example workflows should be pulled into your project as **source** so you can read them, modify prompts, swap models, and ship them as your own. Use [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/<package-name> src/<package-name>
```

This copies the package's `src/` tree into `src/<package-name>/` in your project. From there, register the module like any local NestJS module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { ExampleModule } from './<package-name>/<package-name>.module';

@Module({
  imports: [LoopstackModule.forRoot(), ExampleModule],
})
export class AppModule {}
```

Examples can also be installed as an npm dependency (`npm install @loopstack/<package-name>`) if you want to run them unmodified, but source-first via giget is the recommended path because that's how examples are meant to be used.

## Inspecting a Package Before Committing

To explore a feature package without adding it to the project, install it in a temporary directory:

```bash
mkdir -p /tmp/loopstack-inspect && cd /tmp/loopstack-inspect
npm init -y && npm install @loopstack/<package-name>
```

Review `node_modules/@loopstack/<package-name>/README.md` and (for example packages) `src/` to verify the package does what you need.

For example packages, the simplest inspection is to use giget directly into `/tmp`:

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/<package-name> /tmp/<package-name>
```

## Reading Source Code

When in doubt about a tool's behavior — its input schema, return type, or side effects — read the source directly.

For features installed via npm:

```
node_modules/@loopstack/<package-name>/src/tools/<tool-name>.tool.ts
```

For examples installed via giget, the source lives wherever you copied it (e.g. `src/<package-name>/`).

Look for:

- `@Tool({ name, description, schema })` — the name, description (seen by LLMs), and Zod schema for accepted arguments
- `handle()` method — the actual implementation
- `ToolEnvelope` return — what data comes back (workflow callers see the narrowed `ToolResult` after `tool.call()` throws on `error` / `pending`)
