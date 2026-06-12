---
title: Google OAuth Example
description: Example workflows using Google Workspace APIs with OAuth — Calendar, Gmail, Drive, structured calendar summary and Claude chat agent with 11 Google tools
---

# @loopstack/google-oauth-example

> An example module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module demonstrates how to build workflows that interact with Google Workspace APIs (Calendar, Gmail, Drive) using OAuth authentication. It includes two workflows: a structured calendar summary that fetches upcoming events, and an interactive chat agent powered by Claude that can use all 11 Google Workspace tools.

## Workflows

### Calendar Summary (`google_calendar_summary`)

A multi-step workflow that fetches and displays upcoming Google Calendar events. If the user is not authenticated, it launches the OAuth sub-workflow and retries automatically. Includes a custom `GoogleCalendarFetchEventsTool` that demonstrates building an OAuth-aware tool from scratch using `OAuthTokenStore`.

**Inputs:** `calendarId` (default: `primary`)

**Flow:**

```
start -> calendar_fetched -> end
```

With OAuth branching:

```
calendar_fetched -> (unauthorized via @Guard) -> awaiting_auth
                                                    |
                                              auth_completed -> start (retry)
```

**Key patterns:**

The workflow uses a custom tool to fetch calendar events, then checks for auth errors via `@Guard`:

```typescript
@Transition({ to: 'calendar_fetched' })
async fetchEvents(state: CalendarSummaryState, ctx: RunContext): Promise<CalendarSummaryState> {
  const args = ctx.args as { calendarId: string };
  const result = await this.googleCalendarFetchEvents.call({
    calendarId: args.calendarId,
    timeMin: this.now(),
    timeMax: this.endOfWeek(),
  });
  return {
    ...state,
    requiresAuthentication: result.data!.error === 'unauthorized',
    events: result.data!.events,
  };
}

@Transition({ from: 'calendar_fetched', to: 'awaiting_auth', priority: 10 })
@Guard('needsAuth')
async authRequired(state: CalendarSummaryState): Promise<CalendarSummaryState> {
  await this.oAuthWorkflow.run(
    { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
    { callback: { transition: 'authCompleted' }, show: 'inline', label: 'Google authentication required' },
  );
  return state;
}

needsAuth(state: CalendarSummaryState): boolean {
  return !!state.requiresAuthentication;
}
```

The auth callback uses `wait: true` with `CallbackSchema` and transitions back to `start` to retry:

```typescript
@Transition({
  from: 'awaiting_auth',
  to: 'start',
  wait: true,
  schema: CallbackSchema,
})
async authCompleted(state: CalendarSummaryState, _payload: { workflowId: string }): Promise<CalendarSummaryState> {
  return state;
}
```

On success, the workflow renders a markdown summary using a template:

```typescript
@Transition({ from: 'calendar_fetched', to: 'end' })
async displayResults(state: CalendarSummaryState): Promise<unknown> {
  await this.documentStore.save(MarkdownDocument, {
    markdown: this.render(__dirname + '/templates/calendarSummary.md', { events: state.events }),
  });
  return {};
}
```

**Tools used:**

| Category | Tool                                   | Used in workflow |
| -------- | -------------------------------------- | ---------------- |
| Calendar | `google_calendar_list_calendars`       | No               |
| Calendar | `google_calendar_fetch_events`         | No               |
| Calendar | `google_calendar_create_event`         | No               |
| Calendar | Custom `GoogleCalendarFetchEventsTool` | Yes              |
| Gmail    | `gmail_search_messages`                | No               |
| Gmail    | `gmail_get_message`                    | No               |
| Gmail    | `gmail_send_message`                   | No               |
| Gmail    | `gmail_reply_to_message`               | No               |
| Drive    | `google_drive_list_files`              | No               |
| Drive    | `google_drive_get_file_metadata`       | No               |
| Drive    | `google_drive_download_file`           | No               |
| Drive    | `google_drive_upload_file`             | No               |

### Google Workspace Agent (`google_workspace_agent`)

An interactive chat agent that gives Claude access to all 11 Google Workspace tools. The agent can manage calendar events, search and send emails, browse and upload files to Drive, and handle OAuth automatically via the `AuthenticateGoogleTask` custom tool.

**How it works:**

1. Sets up a hidden system message describing available Google Workspace capabilities
2. Waits for user input via a `wait: true` transition
3. Sends the conversation to Claude with all 11 Google Workspace tools plus `authenticate_google`
4. If `message.stopReason === 'tool_use'`, delegates tool calls via `LlmDelegateToolCallsTool` and collects results with `LlmUpdateToolResultTool`
5. If a tool returns an auth error, the LLM calls `authenticate_google` which launches OAuth
6. Loops back to wait for the next user message

**Agent loop pattern:**

All tools are injected via the constructor. Provider, model, system prompt, and tool list are passed at call time via `{ config: { ... } }`:

```typescript
constructor(
  private readonly llmGenerateText: LlmGenerateTextTool,
  private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
  private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
  private readonly authenticateGoogle: AuthenticateGoogleTask,
  // ... all 11 Google Workspace tools ...
  private readonly oAuth: OAuthWorkflow,
) {
  super();
}

@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn(state: GoogleWorkspaceAgentState): Promise<GoogleWorkspaceAgentState> {
  const result = await this.llmGenerateText.call(
    {},
    {
      config: {
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        system: `You are a helpful Google Workspace assistant with access to Calendar, Gmail, and Drive tools.
When a tool returns an unauthorized error, use authenticateGoogle to let the user sign in,
then retry. Be concise and format results using markdown.`,
        tools: [
          'google_calendar_list_calendars',
          'google_calendar_fetch_events',
          'google_calendar_create_event',
          'gmail_search_messages',
          'gmail_get_message',
          'gmail_send_message',
          'gmail_reply_to_message',
          'google_drive_list_files',
          'google_drive_get_file_metadata',
          'google_drive_download_file',
          'google_drive_upload_file',
          'authenticate_google',
        ],
      },
    },
  );
  return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
}

@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: GoogleWorkspaceAgentState): Promise<GoogleWorkspaceAgentState> {
  await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
    meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
  });
  const result = await this.llmDelegateToolCalls.call(
    {
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    },
    { config: { provider: 'claude' } },
  );
  return { ...state, delegateResult: result.data };
}

hasToolCalls(state: GoogleWorkspaceAgentState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

This is the easiest way to interactively test every Google Workspace tool -- just ask the agent to perform any operation.

## Installation

```bash
npm install @loopstack/google-oauth-example
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import {
  CalendarSummaryWorkflow,
  GoogleExampleModule,
  GoogleWorkspaceAgentWorkflow,
} from '@loopstack/google-oauth-example';

@StudioApp({
  title: 'Google OAuth Example',
  workflows: [CalendarSummaryWorkflow, GoogleWorkspaceAgentWorkflow],
})
@Module({
  imports: [GoogleExampleModule],
})
export class MyAppModule {}
```

### Environment Variables

Create a Google OAuth App at https://console.cloud.google.com/apis/credentials and configure:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5173/oauth/callback
```

For the Google Workspace Agent workflow, you also need an LLM API key:

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Dependencies

- `@loopstack/common` - Core workflow/runtime types and documents (`BaseWorkflow`, `@Workflow`, `@Transition`, `@Guard`, `CallbackSchema`, `MarkdownDocument`)
- `@loopstack/claude-module` - Claude provider registration used by LLM tools
- `@loopstack/llm-provider-module` - LLM adapter tools (`LlmGenerateTextTool`, `LlmMessageDocument`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`)
- `@loopstack/oauth-module` - OAuth infrastructure (`OAuthWorkflow`, `OAuthTokenStore`)
- `@loopstack/google-workspace-module` - All 11 Google Workspace tools (Calendar, Gmail, Drive)

## About

Author: [Jakob Klippel](https://github.com/loopstack-ai)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
