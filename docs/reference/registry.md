---
title: Registry
description: Overview of the Loopstack Registry — discovering, installing, and using pre-built @loopstack/* npm packages for tools, feature modules, and example workflows.
---

# Registry

The Loopstack Registry is a collection of npm packages (`@loopstack/*`) providing pre-built tools, feature modules, and example workflows.

## Discovering Packages

Browse the registry at [loopstack.ai/registry](https://loopstack.ai/registry) to find available packages.

## Installing Packages

All registry packages are installed via npm:

```bash
npm install @loopstack/<package-name>
```

Then import the module in your NestJS app:

```typescript
import { MyFeatureModule } from '@loopstack/<package-name>';

@Module({
  imports: [MyFeatureModule],
})
export class AppModule {}
```

If the package provides workflows or tools, register them in your module:

```typescript
import { Module } from '@nestjs/common';
import { MyWorkflow } from '@loopstack/<package-name>';

@Module({
  imports: [MyFeatureModule],
  providers: [MyWorkflow],
  exports: [MyWorkflow],
})
export class AppModule {}
```

See [Modules & Workspaces](/docs/guides/modules-and-workspaces) for details.

## Package Structure

Registry packages ship a consistent layout:

| Path           | Description                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| `README.md`    | Usage documentation                                                           |
| `SETUP.md`     | Setup instructions and required config                                        |
| `dist/`        | Compiled JavaScript                                                           |
| `src/`         | Full TypeScript source (examples and templates only — features/tools omit it) |
| `package.json` | Package metadata                                                              |

## Inspect a package

**Runtime API** — install into a throwaway project and read docs in `node_modules`:

```bash
mkdir -p /tmp/loopstack-inspect && cd /tmp/loopstack-inspect
npm init -y && npm install @loopstack/<package-name>
```

**Implementation** — use the GitHub link on the registry entry. For tools, look for `@Tool({ schema })`, the `call()` method, and `ToolResult` return values.

## Example packages

| Package                                                                                                                        | Pattern                    |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| [chat-example-workflow](https://loopstack.ai/registry/loopstack-chat-example-workflow)                                         | Multi-turn chat            |
| [prompt-example-workflow](https://loopstack.ai/registry/loopstack-prompt-example-workflow)                                     | Single-turn prompt         |
| [prompt-structured-output-example-workflow](https://loopstack.ai/registry/loopstack-prompt-structured-output-example-workflow) | AI structured output       |
| [tool-call-example-workflow](https://loopstack.ai/registry/loopstack-tool-call-example-workflow)                               | LLM tool calling           |
| [custom-tool-example-module](https://loopstack.ai/registry/loopstack-custom-tool-example-module)                               | Custom tools with services |
| [dynamic-routing-example-workflow](https://loopstack.ai/registry/loopstack-dynamic-routing-example-workflow)                   | Guard-based routing        |
| [workflow-state-example-workflow](https://loopstack.ai/registry/loopstack-workflow-state-example-workflow)                     | State management           |
| [accessing-tool-results-example-workflow](https://loopstack.ai/registry/loopstack-accessing-tool-results-example-workflow)     | Tool result access         |
| [meeting-notes-example-workflow](https://loopstack.ai/registry/loopstack-meeting-notes-example-workflow)                       | Human-in-the-loop          |
| [run-sub-workflow-example](https://loopstack.ai/registry/loopstack-run-sub-workflow-example)                                   | Sub-workflows              |
| [sandbox-example-workflow](https://loopstack.ai/registry/loopstack-sandbox-example-workflow)                                   | Docker sandbox             |
| [secrets-example-workflow](https://loopstack.ai/registry/loopstack-secrets-example-workflow)                                   | Secrets management         |
| [google-oauth-example](https://loopstack.ai/registry/loopstack-google-oauth-example)                                           | Google OAuth               |
| [github-oauth-example](https://loopstack.ai/registry/loopstack-github-oauth-example)                                           | GitHub OAuth               |
