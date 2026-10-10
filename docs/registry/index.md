---
title: Registry Overview
description: The Loopstack Registry — a curated collection of @loopstack/* npm packages grouped by what they add (LLM providers, agents and HITL, tools, OAuth providers and integrations, workspaces and runtime, Studio surfaces). How to discover, install, and inspect registry packages.
---

# Registry

The Loopstack Registry is a curated collection of `@loopstack/*` npm packages that extend Loopstack with ready-to-use capabilities. Instead of building everything from scratch, install a package, import its module, and start using its tools and workflows immediately.

Every registry package is a NestJS module. Its directory in the repository, its npm name and its docs page share one name: `registry/<name>` is published as `@loopstack/<name>` and documented at `/docs/registry/<name>`.

## Packages

### LLM providers

| Package                                                  | What it adds                                                                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`@loopstack/llm-provider`](/docs/registry/llm-provider) | Provider-agnostic LLM contracts, registry and the generic `llm_generate_text` tools; providers register themselves here |
| [`@loopstack/claude`](/docs/registry/claude)             | Anthropic Claude provider via the official SDK, with message storage and prompt caching                                 |
| [`@loopstack/openai`](/docs/registry/openai)             | OpenAI provider via the OpenAI SDK                                                                                      |
| [`@loopstack/claude-tools`](/docs/registry/claude-tools) | Claude-specific tools such as web search through Claude server tools                                                    |

### Agents and human-in-the-loop

| Package                                              | What it adds                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`@loopstack/agent`](/docs/registry/agent)           | Generic agent workflow — configurable agent loop with tool calling, error handling and cancel support |
| [`@loopstack/code-agent`](/docs/registry/code-agent) | Codebase exploration agent built on `@loopstack/agent`                                                |
| [`@loopstack/hitl`](/docs/registry/hitl)             | Human-in-the-loop — ask questions, present options and request confirmations during a run             |
| [`@loopstack/handoff`](/docs/registry/handoff)       | Hand-off documents that drive the Studio Handoff panel and the CLI terminal hand-off                  |

### Tools

| Package                                                                            | What it adds                                                                        |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`@loopstack/mcp`](/docs/registry/mcp)                                             | List and call tools on remote MCP servers over Streamable HTTP                      |
| [`@loopstack/web`](/docs/registry/web)                                             | Fetch web content as Markdown, optionally summarized by the configured LLM provider |
| [`@loopstack/typesafe`](/docs/registry/typesafe)                                   | Typed yes/no, choice and score decisions about workflow state via TypeSafe AI       |
| [`@loopstack/git`](/docs/registry/git)                                             | Git tools and API for workspaces — commit, push, pull, branch, diff and more        |
| [`@loopstack/docker-sandbox`](/docs/registry/docker-sandbox)                       | Isolated Docker containers for running untrusted code                               |
| [`@loopstack/docker-sandbox-filesystem`](/docs/registry/docker-sandbox-filesystem) | Safe filesystem operations inside a Docker sandbox                                  |

### OAuth providers and integrations

| Package                                                              | What it adds                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`@loopstack/oauth`](/docs/registry/oauth)                           | Provider-agnostic OAuth 2.0 — generic OAuth workflow, token storage and a provider registry |
| [`@loopstack/github`](/docs/registry/github)                         | GitHub OAuth provider and tools for repositories, issues, pull requests and actions         |
| [`@loopstack/google-workspace`](/docs/registry/google-workspace)     | Google OAuth provider and tools for Calendar, Drive and Gmail                               |
| [`@loopstack/github-integration`](/docs/registry/github-integration) | Connect a workspace to a GitHub repository — OAuth, push, pull and sync as one workflow     |

### Workspaces and runtime

| Package                                                      | What it adds                                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| [`@loopstack/remote-client`](/docs/registry/remote-client)   | HTTP client and tools for a remote workspace server — files, shell, app lifecycle; ships the server in `server/` |
| [`@loopstack/code-workspace`](/docs/registry/code-workspace) | Isolated per-run checkouts from shared bases, in disposable Docker containers                                    |
| [`@loopstack/claims`](/docs/registry/claims)                 | Resource claims — exclusive and pooled resources held by a run or a workspace                                    |
| [`@loopstack/secrets`](/docs/registry/secrets)               | Workspace secrets — entity, service, tools and REST API                                                          |
| [`@loopstack/quota`](/docs/registry/quota)                   | Opt-in quota tracking and enforcement, Redis-backed                                                              |

### Studio surfaces

| Package                                                                  | What it adds                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [`@loopstack/local-file-explorer`](/docs/registry/local-file-explorer)   | File tree and content browsing of the local filesystem in Studio      |
| [`@loopstack/remote-file-explorer`](/docs/registry/remote-file-explorer) | File tree and content browsing of a remote workspace server in Studio |

## Looking for Examples?

Complete, working workflows that demonstrate Loopstack patterns live in the [Examples](/docs/examples/llm) app, not in the registry. They are meant to be read and copied rather than installed.

## Installing a Package

All registry packages are published on npm:

```bash
npm install @loopstack/claude
```

Import the module in your app:

```typescript
import { ClaudeModule } from '@loopstack/claude';

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
npx giget@latest gh:loopstack-ai/loopstack/registry/claude /tmp/claude
```

The repo path pattern is:

```
gh:loopstack-ai/loopstack/registry/<name>
```

Review the `README.md` for usage documentation, installation, and configuration. For implementation details, look at the TypeScript source in `src/`.
