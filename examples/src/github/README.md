---
title: GitHub Examples
description: GitHub integration workflow examples for Loopstack — a scripted repo overview that walks the GitHub read tools, and a chat agent built on ChatAgentWorkflow with 25 GitHub tools. Both sign in through the OAuth sub-workflow when a tool reports unauthorized.
---

# GitHub Examples

> GitHub integration workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two ways to use the `@loopstack/github` tools:

- A **scripted overview** workflow — single pass, hand-rolled tool sequence
- An **interactive agent** workflow — `ChatAgentWorkflow` from `@loopstack/agent` with the GitHub tools

Both share the same sign-in pattern: when a tool returns unauthorized, launch the `OAuthWorkflow` sub-workflow inline, then retry. The overview launches it in its own transitions; the agent calls the `authenticate_github` task tool, which launches it.

For syncing a workspace to a GitHub repository, see the [GitHub Repo Sync](/docs/examples/git#github-repo-sync) example in `git`.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/agent @loopstack/claude @loopstack/common @loopstack/github @loopstack/oauth
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { GitHubExamplesModule } from './github/github-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), GitHubExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

The agent example uses Claude via `@loopstack/llm-provider` — `@Global`, configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { GitHubExamplesModule } from './github/github-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }), GitHubExamplesModule],
})
export class AppModule {}
```

`GitHubExamplesModule` re-imports `AgentModule`, `ClaudeModule` and `GitHubModule`. The chat agent takes its provider and model from the `LlmProviderModule` configuration. `GitHubModule` transitively pulls in the global `OAuthModule` and registers the GitHub OAuth provider — no additional OAuth wiring required in your AppModule.

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Refer to `@loopstack/github` for the full OAuth setup (redirect URL, scopes).

## Running

Start a workflow from Studio (app **GitHub Examples**) or with the Loopstack CLI:

```bash
loopstack run github_overview_example --arg owner=octocat --arg repo=Hello-World
loopstack run github_agent_example --arg initialMessage="List my open pull requests."
```

On the first run you are asked to sign in to GitHub; after that the overview renders a markdown summary of the repository, and the agent answers the initial message and waits for your next one.

## Examples

| Example                             | Studio title                | Description                                              |
| ----------------------------------- | --------------------------- | -------------------------------------------------------- |
| [GitHub Overview](#github-overview) | `GitHub - Overview Example` | Scripted walk of GitHub read tools with markdown summary |
| [GitHub Agent](#github-agent)       | `GitHub - Agent Example`    | Chat agent with 25 GitHub tools                          |

---

## GitHub Overview

A scripted (non-agent) GitHub workflow that walks every major GitHub read tool: user info, orgs, repo details, branches, issues, PRs, directory contents, workflow runs, and code search. On any unauthorized error it pauses, launches the `OAuthWorkflow` sub-workflow inline, then retries from the start.

### Sign in and retry

This is the reference for the sign-in flow of a scripted workflow. The [Google Calendar Summary](/docs/examples/google-workspace#google-calendar-summary) example uses the same flow. It has four parts:

1. **Catch the error.** A tool with no valid token throws an error whose message contains "authenticate" ("Please authenticate first." / "Please re-authenticate."). `fetchUser` catches it and sets `requiresAuthentication` in the state. It rethrows any other error.
2. **Start the sign-in.** `authRequired` has `priority: 10` and the `needsAuth` guard, so it runs before the normal next step when the state asks for sign-in. It calls `OAuthWorkflow.run()` with the provider, the scopes, `onSuccess: { transition: 'authCompleted' }` and `onFailure: { transition: 'authFailed' }`, and shows the sub-workflow inline.
3. **Retry.** `authCompleted` is a `wait: true` transition back to `start`. A completed sub-workflow calls it, and the run fetches again with the new token.
4. **Stop on a failed sign-in.** A failed or canceled sub-workflow calls `authFailed`, a `wait: true` transition to `auth_failed` that saves the reason as an `ErrorDocument`. The run waits there instead of starting the sign-in again. From there `retryAuth`, also `wait: true`, goes back to `start` once the OAuth app is configured.

### Files

- `github-overview-example.workflow.ts` — workflow class
- `templates/repoOverview.md` — Handlebars markdown summary template

## GitHub Agent

A chat agent with 25 GitHub tools: repos, issues, PRs, code, actions, and search. The workflow injects only `ChatAgentWorkflow` and runs it with the system prompt, the tool names, and `initialMessage` as the first user message. The agent resolves each tool by its `@Tool({ name })`, so the workflow does not inject the tools.

When a tool returns `{ error: "unauthorized" }`, the agent calls `authenticate_github` with the scopes it needs. `AuthenticateGitHubTask` (in `shared/github`) runs the `OAuthWorkflow` sub-workflow inline. The tool call stays pending until the sign-in completes, then the agent retries the request.

### Files

- `github-agent-example.workflow.ts` — workflow class with the tool names
- `templates/system.md` — system prompt
- `../../shared/github/authenticate-github-task.tool.ts` — the `authenticate_github` task tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
