---
title: Google Workspace Examples
description: Google Workspace integration workflow examples for Loopstack — a scripted Google Calendar summary, and a chat agent built on ChatAgentWorkflow with Calendar, Gmail and Drive tools. Both sign in through the OAuth sub-workflow when a tool reports unauthorized.
---

# Google Workspace Examples

> Google Workspace integration workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two ways to use the `@loopstack/google-workspace` tools:

- A **scripted summary** workflow — fetches calendar events and renders them
- An **interactive agent** workflow — `ChatAgentWorkflow` from `@loopstack/agent` with Calendar, Gmail, and Drive tools

Both share the same sign-in pattern: when a tool returns unauthorized, launch the `OAuthWorkflow` sub-workflow inline, then retry. The summary launches it in its own transitions; the agent calls the `authenticate_google` task tool, which launches it.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/agent @loopstack/claude @loopstack/common @loopstack/google-workspace @loopstack/oauth
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { GoogleWorkspaceExamplesModule } from './google-workspace/google-workspace-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), GoogleWorkspaceExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

The agent example uses Claude via `@loopstack/llm-provider` — `@Global`, configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { GoogleWorkspaceExamplesModule } from './google-workspace/google-workspace-examples.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }),
    GoogleWorkspaceExamplesModule,
  ],
})
export class AppModule {}
```

`GoogleWorkspaceExamplesModule` re-imports `AgentModule`, `ClaudeModule` and `GoogleWorkspaceModule`. The chat agent takes its provider and model from the `LlmProviderModule` configuration. `GoogleWorkspaceModule` transitively pulls in the global `OAuthModule` and registers the Google OAuth provider — no additional OAuth wiring required in your AppModule.

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Refer to `@loopstack/google-workspace` for the full OAuth setup (redirect URL, scopes).

## Running

Start a workflow from Studio (app **Google Workspace Examples**) or with the Loopstack CLI:

```bash
loopstack run google_calendar_summary_example --arg calendarId=primary
loopstack run google_workspace_agent_example --arg initialMessage="Find my unread emails from today."
```

On the first run you are asked to sign in to Google; after that the summary renders your upcoming events as markdown, and the agent answers the initial message and waits for your next one.

## Examples

| Example                                             | Studio title                                  | Description                                      |
| --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| [Google Calendar Summary](#google-calendar-summary) | `Google Workspace - Calendar Summary Example` | Scripted calendar fetch + markdown summary       |
| [Google Workspace Agent](#google-workspace-agent)   | `Google Workspace - Agent Example`            | Chat agent with Calendar, Gmail, and Drive tools |

---

## Google Calendar Summary

Fetches the user's upcoming calendar events with `GoogleCalendarFetchEventsTool` from `@loopstack/google-workspace` and renders a markdown summary. On unauthorized it launches the `OAuthWorkflow` sub-workflow inline and retries — the flow that [GitHub Overview](/docs/examples/github#sign-in-and-retry) explains step by step.

### Files

- `google-calendar-summary-example.workflow.ts` — workflow class
- `templates/calendarSummary.md` — Handlebars markdown summary

## Google Workspace Agent

A chat agent with 11 Google Workspace tools for Calendar, Gmail, and Drive. The workflow injects only `ChatAgentWorkflow` and runs it with the system prompt, the tool names, and `initialMessage` as the first user message. The agent resolves each tool by its `@Tool({ name })`, so the workflow does not inject the tools.

When a tool returns `{ error: "unauthorized" }`, the agent calls `authenticate_google` with the scopes it needs. `AuthenticateGoogleTask` (in `shared/google`) runs the `OAuthWorkflow` sub-workflow inline. The tool call stays pending until the sign-in completes, then the agent retries the request.

### Files

- `google-workspace-agent-example.workflow.ts` — workflow class with the tool names
- `templates/system.md` — system prompt
- `../../shared/google/authenticate-google-task.tool.ts` — the `authenticate_google` task tool

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
