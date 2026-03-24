# @loopstack/google-oauth-example

> An example module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module demonstrates how to build workflows that interact with Google Workspace APIs (Calendar, Gmail, Drive) using OAuth authentication. It includes two workflows: a structured calendar overview that fetches upcoming events, and an interactive chat agent powered by an LLM that can use all 11 Google Workspace tools.

## Workflows

### Calendar Summary (`calendarSummary`)

A multi-step workflow that fetches and displays upcoming Google Calendar events. If the user is not authenticated, it launches the OAuth sub-workflow and retries automatically.

**Inputs:** `calendarId` (default: `primary`)

**Flow:**

```
start -> fetch_events -> calendar_fetched -> display_results -> end
```

With OAuth branching:

```
calendar_fetched -> (unauthorized) -> auth_required -> awaiting_auth
                                                          |
                                                    auth_completed -> start (retry)
```

**Tools exercised in the workflow:**

| Category | Tool                                 | Used in workflow |
| -------- | ------------------------------------ | ---------------- |
| Calendar | `googleCalendarListCalendars`        | No               |
| Calendar | `googleCalendarFetchEventsModule`    | No               |
| Calendar | `googleCalendarCreateEvent`          | No               |
| Calendar | `googleCalendarFetchEvents` (custom) | Yes              |
| Gmail    | `gmailSearchMessages`                | No               |
| Gmail    | `gmailGetMessage`                    | No               |
| Gmail    | `gmailSendMessage`                   | No               |
| Gmail    | `gmailReplyToMessage`                | No               |
| Drive    | `googleDriveListFiles`               | No               |
| Drive    | `googleDriveGetFileMetadata`         | No               |
| Drive    | `googleDriveDownloadFile`            | No               |
| Drive    | `googleDriveUploadFile`              | No               |

All 11 Google Workspace tools (plus the custom calendar tool) are injected and available; 1 is called directly by the workflow transitions. The remaining tools are available for use but not exercised automatically.

### Google Workspace Agent (`googleWorkspaceAgent`)

An interactive chat agent that gives an LLM access to all 11 Google Workspace tools. The agent can manage calendar events, search and send emails, browse and upload files to Drive, and handle OAuth automatically.

**How it works:**

1. Sets up a system prompt describing available Google Workspace capabilities
2. Waits for user input via a chat prompt
3. Sends the conversation to the LLM with all Google Workspace tools available
4. Executes any tool calls the LLM makes
5. If a tool returns an auth error, launches OAuth and resumes after authentication
6. Loops back to wait for the next user message

This is the easiest way to interactively test every Google Workspace tool — just ask the agent to perform any operation.

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
OPENAI_API_KEY=your-openai-api-key
```

## Dependencies

- `@loopstack/core` — Core framework functionality including `ExecuteWorkflowAsync`
- `@loopstack/ai-module` — LLM integration (`AiGenerateText`, `DelegateToolCall`)
- `@loopstack/oauth-module` — OAuth infrastructure (`OAuthTokenStore`, `OAuthWorkflow`)
- `@loopstack/google-workspace-module` — All 11 Google Workspace tools and the Google OAuth provider
- `@loopstack/core-ui-module` — `CreateDocument`, `LinkDocument`, `MarkdownDocument`
- `@loopstack/create-chat-message-tool` — `CreateChatMessage`

## About

Author: [Jakob Klippel](https://github.com/loopstack-ai)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
