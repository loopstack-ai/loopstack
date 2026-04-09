# @loopstack/google-oauth-example

> An example module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module demonstrates how to build workflows that interact with Google Workspace APIs (Calendar, Gmail, Drive) using OAuth authentication. It includes two workflows: a structured calendar summary that fetches upcoming events, and an interactive chat agent powered by Claude that can use all 11 Google Workspace tools.

## Workflows

### Calendar Summary (`calendarSummary`)

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
@Initial({ to: 'calendar_fetched' })
async fetchEvents(args: { calendarId: string }) {
  const result: ToolResult<CalendarFetchResult> = await this.googleCalendarFetchEvents.call({
    calendarId: args.calendarId,
    timeMin: this.now(),
    timeMax: this.endOfWeek(),
  });
  this.requiresAuthentication = result.data!.error === 'unauthorized';
  this.events = result.data!.events;
}

@Transition({ from: 'calendar_fetched', to: 'awaiting_auth', priority: 10 })
@Guard('needsAuth')
async authRequired() {
  const result = await this.oAuth.run(
    { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
    { alias: 'oAuth', callback: { transition: 'authCompleted' } },
  );

  await this.repository.save(
    LinkDocument,
    {
      label: 'Google authentication required',
      workflowId: result.workflowId,
      embed: true,
      expanded: true,
    },
    { id: `link_${result.workflowId}` },
  );
}

needsAuth(): boolean {
  return !!this.requiresAuthentication;
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
async authCompleted(payload: { workflowId: string }) {
  await this.repository.save(
    LinkDocument,
    {
      status: 'success',
      label: 'Google authentication completed',
      workflowId: payload.workflowId,
      embed: true,
      expanded: false,
    },
    { id: `link_${payload.workflowId}` },
  );
}
```

On success, the workflow renders a markdown summary using a template:

```typescript
@Final({ from: 'calendar_fetched' })
async displayResults() {
  await this.repository.save(MarkdownDocument, {
    markdown: this.render(__dirname + '/templates/calendarSummary.md', { events: this.events }),
  });
}
```

**Tools used:**

| Category | Tool                                   | Used in workflow |
| -------- | -------------------------------------- | ---------------- |
| Calendar | `googleCalendarListCalendars`          | No               |
| Calendar | `googleCalendarFetchEvents`            | No               |
| Calendar | `googleCalendarCreateEvent`            | No               |
| Calendar | Custom `GoogleCalendarFetchEventsTool` | Yes              |
| Gmail    | `gmailSearchMessages`                  | No               |
| Gmail    | `gmailGetMessage`                      | No               |
| Gmail    | `gmailSendMessage`                     | No               |
| Gmail    | `gmailReplyToMessage`                  | No               |
| Drive    | `googleDriveListFiles`                 | No               |
| Drive    | `googleDriveGetFileMetadata`           | No               |
| Drive    | `googleDriveDownloadFile`              | No               |
| Drive    | `googleDriveUploadFile`                | No               |

### Google Workspace Agent (`googleWorkspaceAgent`)

An interactive chat agent that gives Claude access to all 11 Google Workspace tools. The agent can manage calendar events, search and send emails, browse and upload files to Drive, and handle OAuth automatically via the `AuthenticateGoogleTask` custom tool.

**How it works:**

1. Sets up a hidden system message describing available Google Workspace capabilities
2. Waits for user input via a `wait: true` transition
3. Sends the conversation to Claude with all 11 Google Workspace tools plus `authenticateGoogle`
4. If `stop_reason === 'tool_use'`, delegates tool calls via `DelegateToolCalls` and collects results with `UpdateToolResult`
5. If a tool returns an auth error, the LLM calls `authenticateGoogle` which launches OAuth
6. Loops back to wait for the next user message

**Agent loop pattern:**

```typescript
@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn() {
  const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
    system: `You are a helpful Google Workspace assistant with access to Calendar, Gmail, and Drive tools.
When a tool returns an unauthorized error, use authenticateGoogle to let the user sign in,
then retry. Be concise and format results using markdown.`,
    claude: { model: 'claude-sonnet-4-6' },
    messagesSearchTag: 'message',
    tools: [
      'googleCalendarListCalendars',
      'googleCalendarFetchEvents',
      'googleCalendarCreateEvent',
      'gmailSearchMessages',
      'gmailGetMessage',
      'gmailSendMessage',
      'gmailReplyToMessage',
      'googleDriveListFiles',
      'googleDriveGetFileMetadata',
      'googleDriveDownloadFile',
      'googleDriveUploadFile',
      'authenticateGoogle',
    ],
  });
  this.llmResult = result.data;
}

@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls() {
  const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.call({
    message: this.llmResult!,
    document: ClaudeMessageDocument,
    callback: { transition: 'toolResultReceived' },
  });
  this.delegateResult = result.data;
}

hasToolCalls(): boolean {
  return this.llmResult?.stop_reason === 'tool_use';
}
```

This is the easiest way to interactively test every Google Workspace tool -- just ask the agent to perform any operation.

## Setup

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

- `@loopstack/common` - Core framework decorators (`BaseWorkflow`, `@Workflow`, `@Initial`, `@Transition`, `@Final`, `@Guard`, `@InjectTool`, `@InjectWorkflow`, `CallbackSchema`, `ToolResult`, `BaseTool`, `Tool`)
- `@loopstack/core` - Provides `LinkDocument` and `MarkdownDocument`
- `@loopstack/claude-module` - Claude integration (`ClaudeGenerateText`, `ClaudeMessageDocument`, `DelegateToolCalls`, `UpdateToolResult`)
- `@loopstack/oauth-module` - OAuth infrastructure (`OAuthWorkflow`, `OAuthTokenStore`)
- `@loopstack/google-workspace-module` - All 11 Google Workspace tools (Calendar, Gmail, Drive)
- `@loopstack/create-chat-message-tool` - `CreateChatMessage` (used in agent workflow)

## About

Author: [Jakob Klippel](https://github.com/loopstack-ai)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
