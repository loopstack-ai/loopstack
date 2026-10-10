---
title: Registry Overview
description: The Loopstack Registry — a curated collection of npm packages providing feature modules (LLM, OAuth, Git, HITL) and standalone tools (sandbox, filesystem). How to discover, install, and use @loopstack/* packages.
---

# Registry

The Loopstack Registry is a curated collection of `@loopstack/*` npm packages that extend Loopstack with ready-to-use capabilities. Instead of building everything from scratch, install a package, import its module, and start using its tools and workflows immediately.

## Package Categories

### Features

Feature packages add entire capabilities to your app — LLM providers, OAuth flows, Git integration, human-in-the-loop, and more. Each feature ships as a NestJS module with tools, services, and configuration.

Examples: `@loopstack/claude-module`, `@loopstack/github-module`, `@loopstack/hitl`, `@loopstack/oauth-module`, `@loopstack/web-module` (web fetch and summarization), `@loopstack/typesafe-module` (typed decisions and classifications with TypeSafe AI)

### Tools

Tool packages add standalone tools you inject into your workflows without a surrounding feature module.

Examples: `@loopstack/sandbox-tool` (Docker sandbox containers), `@loopstack/sandbox-filesystem` (safe filesystem operations inside a sandbox)

## Looking for Examples?

Complete, working workflows that demonstrate Loopstack patterns live in the [Examples](/docs/examples/llm) app, not in the registry. They are meant to be read and copied rather than installed.

## Installing a Package

All registry packages are published on npm:

```bash
npm install @loopstack/claude-module
```

Import the module in your app:

```typescript
import { ClaudeModule } from '@loopstack/claude-module';

@Module({
  imports: [ClaudeModule],
})
export class AppModule {}
```

The module exports its tools, making them available for injection in your workflows via standard NestJS constructor injection:

```typescript
@Workflow({ name: 'my-workflow' })
export class MyWorkflow {
  constructor(private readonly generateText: LlmGenerateTextTool) {}
}
```

## Inspecting a Package

To browse the source code of any registry package, use [giget](https://github.com/unjs/giget) to download it directly from the GitHub repository:

```bash
# Download a feature module
npx giget@latest gh:loopstack-ai/loopstack/registry/features/claude-module /tmp/claude-module

# Download a standalone tool
npx giget@latest gh:loopstack-ai/loopstack/registry/tools/sandbox-tool /tmp/sandbox-tool
```

The repo path pattern is:

```
gh:loopstack-ai/loopstack/registry/<category>/<package-name>
```

Where `<category>` is `features` or `tools`.

Review the `README.md` for usage documentation, installation, and configuration. For implementation details, look at the TypeScript source in `src/`.
