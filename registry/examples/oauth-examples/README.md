---
title: OAuth Examples
description: Workflow examples for OAuth-protected integrations in Loopstack — GitHub repos overview and chat agent, Google Calendar summary and Google Workspace chat agent. Each pair demonstrates the same shape: scripted single-pass workflow + interactive agent with auto-OAuth retry.
---

# @loopstack/oauth-examples

> OAuth integration workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two integration patterns demonstrated for two providers. Each provider has:

- A **scripted overview/summary** workflow — single-pass, hand-rolled tool sequence
- An **interactive agent** workflow — Claude with the full tool set, OAuth auto-retry

Both shapes share the same OAuth retry pattern: on unauthorized error, launch the OAuth sub-workflow inline, then retry from start.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/oauth-examples src/oauth-examples
```

Then register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { OAuthExamplesModule } from './oauth-examples/oauth-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), OAuthExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/oauth-examples
```

```typescript
import { OAuthExamplesModule } from '@loopstack/oauth-examples';
```

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Refer to `@loopstack/github-module` and `@loopstack/google-workspace-module` for the full OAuth setup (redirect URLs, scopes).

## Examples

| Example                                             | Studio title                              | Description                                                    |
| --------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| [GitHub Overview](#github-overview)                 | `OAuth - GitHub Overview Example`         | Scripted walk of GitHub read tools with markdown summary       |
| [GitHub Agent](#github-agent)                       | `OAuth - GitHub Agent Example`            | Interactive Claude agent with 25 GitHub tools                  |
| [Google Calendar Summary](#google-calendar-summary) | `OAuth - Google Calendar Summary Example` | Scripted calendar fetch + markdown summary                     |
| [Google Workspace Agent](#google-workspace-agent)   | `OAuth - Google Workspace Agent Example`  | Interactive Claude agent with Calendar, Gmail, and Drive tools |

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

## Google Calendar Summary

Fetches the user's upcoming calendar events via `GoogleCalendarFetchEventsTool` and renders a markdown summary. On unauthorized it launches the `OAuthWorkflow` sub-workflow inline and retries.

### Files

- `google-calendar-summary-example.workflow.ts` — workflow class
- `templates/calendarSummary.md` — Handlebars markdown summary

## Google Workspace Agent

An interactive Claude chat agent with 11 Google Workspace tools (Calendar, Gmail, Drive). When a tool returns unauthorized, the agent calls `authenticateGoogle` to launch the OAuth sub-workflow and retries.

### Files

- `google-workspace-agent-example.workflow.ts` — workflow class
- `google-workspace-agent-example.ui.yaml` — chat prompt-input widget
- `templates/systemMessage.md` — system prompt

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
