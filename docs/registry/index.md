---
title: Registry Overview
description: The Loopstack Registry — a curated collection of npm packages providing feature modules (LLM, OAuth, Git, HITL), standalone tools (sandbox, filesystem), and example workflows. How to discover, install, and use @loopstack/* packages.
---

# Registry

The Loopstack Registry is a curated collection of `@loopstack/*` npm packages that extend Loopstack with ready-to-use capabilities. Instead of building everything from scratch, install a package, import its module, and start using its tools and workflows immediately.

## Package Categories

### Features

Feature packages add entire capabilities to your app — LLM providers, OAuth flows, Git integration, human-in-the-loop, and more. Each feature ships as a NestJS module with tools, services, and configuration.

Examples: `@loopstack/claude-module`, `@loopstack/github-module`, `@loopstack/hitl`, `@loopstack/oauth-module`, `@loopstack/web-module` (web fetch and summarization)

### Examples

Example packages are complete, working workflows that demonstrate Loopstack patterns. Use them as starting points — install the package, study the source, and adapt it to your needs.

Examples: `@loopstack/chat-example-workflow`, `@loopstack/agent-example-workflow`, `@loopstack/sandbox-example-workflow`

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
npx giget@latest gh:loopstackai/loopstack/registry/features/claude-module /tmp/claude-module

# Download an example workflow
npx giget@latest gh:loopstackai/loopstack/registry/examples/chat-example-workflow /tmp/chat-example
```

The repo path pattern is:

```
gh:loopstackai/loopstack/registry/<category>/<package-name>
```

Where `<category>` is `features`, `tools`, or `examples`.

Review the `README.md` for usage documentation, installation, and configuration. For implementation details, look at the TypeScript source in `src/`.
