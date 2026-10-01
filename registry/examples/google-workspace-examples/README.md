---
title: Google Workspace Examples
description: Google Workspace integration workflow examples for Loopstack — a scripted Google Calendar summary, and an interactive Claude agent with Calendar, Gmail and Drive tools. Both sign in through the OAuth sub-workflow when a tool reports unauthorized.
---

# @loopstack/google-workspace-examples

> Google Workspace integration workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two ways to use the `@loopstack/google-workspace-module` tools:

- A **scripted summary** workflow — fetches calendar events with a custom tool and renders them
- An **interactive agent** workflow — Claude with Calendar, Gmail, and Drive tools

Both share the same sign-in pattern: when a tool returns unauthorized, launch the `OAuthWorkflow` sub-workflow inline, then retry.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/google-workspace-examples src/google-workspace-examples
```

Then register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { GoogleWorkspaceExamplesModule } from './google-workspace-examples/google-workspace-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), GoogleWorkspaceExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/google-workspace-examples
```

```typescript
import { GoogleWorkspaceExamplesModule } from '@loopstack/google-workspace-examples';
```

## Required app-module configuration

Both examples use Claude via `@loopstack/llm-provider-module` — `@Global`, configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { GoogleWorkspaceExamplesModule } from '@loopstack/google-workspace-examples';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { LoopstackModule } from '@loopstack/loopstack-module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }),
    GoogleWorkspaceExamplesModule,
  ],
})
export class AppModule {}
```

`GoogleWorkspaceExamplesModule` re-imports `ClaudeModule` and `GoogleWorkspaceModule`. `GoogleWorkspaceModule` transitively pulls in the global `OAuthModule` and registers the Google OAuth provider — no additional OAuth wiring required in your AppModule.

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Refer to `@loopstack/google-workspace-module` for the full OAuth setup (redirect URL, scopes).

## Running

Start a workflow from Studio (app **Google Workspace Examples**) or with the Loopstack CLI:

```bash
loopstack run google_calendar_summary_example --arg calendarId=primary
loopstack run google_workspace_agent_example
```

On the first run you are asked to sign in to Google; after that the summary renders your upcoming events as markdown, and the agent waits for your chat messages.

## Examples

| Example                                             | Studio title                                  | Description                                                    |
| --------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| [Google Calendar Summary](#google-calendar-summary) | `Google Workspace - Calendar Summary Example` | Scripted calendar fetch + markdown summary                     |
| [Google Workspace Agent](#google-workspace-agent)   | `Google Workspace - Agent Example`            | Interactive Claude agent with Calendar, Gmail, and Drive tools |

---

## Google Calendar Summary

Fetches the user's upcoming calendar events via `GoogleCalendarFetchEventsTool` and renders a markdown summary. On unauthorized it launches the `OAuthWorkflow` sub-workflow inline and retries.

### Files

- `google-calendar-summary-example.workflow.ts` — workflow class
- `templates/calendarSummary.md` — Handlebars markdown summary
- `../../shared/google/google-calendar-fetch-events.tool.ts` — custom calendar tool

## Google Workspace Agent

An interactive Claude chat agent with 11 Google Workspace tools (Calendar, Gmail, Drive). When a tool returns unauthorized, the agent calls `authenticateGoogle` to launch the OAuth sub-workflow and retries.

### Files

- `google-workspace-agent-example.workflow.ts` — workflow class
- `google-workspace-agent-example.ui.yaml` — chat prompt-input widget
- `templates/systemMessage.md` — system prompt

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
