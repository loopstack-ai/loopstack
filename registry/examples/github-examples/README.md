---
title: GitHub Examples
description: GitHub integration workflow examples for Loopstack — a scripted repo overview that walks the GitHub read tools, and an interactive Claude agent with 25 GitHub tools. Both sign in through the OAuth sub-workflow when a tool reports unauthorized.
---

# @loopstack/github-examples

> GitHub integration workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two ways to use the `@loopstack/github-module` tools:

- A **scripted overview** workflow — single pass, hand-rolled tool sequence
- An **interactive agent** workflow — Claude with the full GitHub tool set

Both share the same sign-in pattern: when a tool returns unauthorized, launch the `OAuthWorkflow` sub-workflow inline, then retry.

For syncing a workspace to a GitHub repository, see the [GitHub Repo Sync](/docs/registry/examples/git-examples#github-repo-sync) example in `@loopstack/git-examples`.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/github-examples src/github-examples
```

Then register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { GitHubExamplesModule } from './github-examples/github-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), GitHubExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/github-examples
```

```typescript
import { GitHubExamplesModule } from '@loopstack/github-examples';
```

## Required app-module configuration

Both examples use Claude via `@loopstack/llm-provider-module` — `@Global`, configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { GitHubExamplesModule } from '@loopstack/github-examples';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { LoopstackModule } from '@loopstack/loopstack-module';

@Module({
  imports: [LoopstackModule.forRoot(), LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }), GitHubExamplesModule],
})
export class AppModule {}
```

`GitHubExamplesModule` re-imports `ClaudeModule` and `GitHubModule`. `GitHubModule` transitively pulls in the global `OAuthModule` and registers the GitHub OAuth provider — no additional OAuth wiring required in your AppModule.

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Refer to `@loopstack/github-module` for the full OAuth setup (redirect URL, scopes).

## Running

Start a workflow from Studio (app **GitHub Examples**) or with the Loopstack CLI:

```bash
loopstack run github_overview_example --arg owner=octocat --arg repo=Hello-World
loopstack run github_agent_example
```

On the first run you are asked to sign in to GitHub; after that the overview renders a markdown summary of the repository, and the agent waits for your chat messages.

## Examples

| Example                             | Studio title                | Description                                              |
| ----------------------------------- | --------------------------- | -------------------------------------------------------- |
| [GitHub Overview](#github-overview) | `GitHub - Overview Example` | Scripted walk of GitHub read tools with markdown summary |
| [GitHub Agent](#github-agent)       | `GitHub - Agent Example`    | Interactive Claude agent with 25 GitHub tools            |

---

## GitHub Overview

A scripted (non-agent) GitHub workflow that walks every major GitHub read tool: user info, orgs, repo details, branches, issues, PRs, directory contents, workflow runs, and code search. On any unauthorized error it pauses, launches the `OAuthWorkflow` sub-workflow inline, then retries from the start.

### Files

- `github-overview-example.workflow.ts` — workflow class
- `templates/repoOverview.md` — Handlebars markdown summary template

## GitHub Agent

An interactive Claude chat agent with 25 GitHub tools wired in: repos, issues, PRs, code, actions, and search. When a tool returns unauthorized, the agent calls `authenticateGitHub` to launch the OAuth sub-workflow and retries.

### Files

- `github-agent-example.workflow.ts` — workflow class
- `github-agent-example.ui.yaml` — chat prompt-input widget
- `templates/systemMessage.md` — system prompt

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
