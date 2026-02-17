# @loopstack/google-oauth-calendar-example

> An example module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module demonstrates how to build a workflow that fetches data from an OAuth-protected API (Google Calendar) and handles authentication automatically using the sub-workflow pattern with `@loopstack/oauth-module`.

## Overview

The Google OAuth Calendar Example shows a real-world pattern: attempt an API call, and if the user is not authenticated, launch the OAuth workflow as an embedded sub-workflow. Once the user completes sign-in, the parent workflow automatically retries.

By using this example as a reference, you'll learn how to:

- Use `OAuthTokenStore` to check for valid tokens before making API calls
- Launch the OAuth workflow as a sub-workflow via `ExecuteWorkflowAsync`
- Display the OAuth flow inline using an embedded `LinkDocument` with `embed: true` and `expanded: true`
- Automatically retry after authentication completes via the callback transition
- Render results using `MarkdownDocument`

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Workflow Flow

```
start → fetch_events → calendar_fetched
                          ├── (unauthorized) → auth_required → awaiting_auth
                          │                                       ↓
                          │                                  auth_completed → start (retry)
                          └── (success) → display_results → end
```

### 1. Fetching Calendar Events

The `GoogleCalendarFetchEventsTool` checks for a valid Google OAuth token via `OAuthTokenStore.getValidAccessToken()`. If no token exists, it returns `{ error: "unauthorized" }` instead of throwing, allowing the workflow to branch:

```yaml
- tool: googleCalendarFetchEvents
  args:
    calendarId: ${{ args.calendarId }}
    timeMin: ${{ now() }}
    timeMax: ${{ endOfWeek() }}
  assign:
    requiresAuthentication: ${{ result.data.error == "unauthorized" }}
    events: ${{ result.data.events }}
```

### 2. Launching OAuth as a Sub-Workflow

If authentication is required, the workflow uses `ExecuteWorkflowAsync` to launch the generic OAuth workflow as a child. A `LinkDocument` with `embed: true` and `expanded: true` renders the OAuth flow inline as an iframe so the user can authenticate without leaving the page:

```yaml
- id: auth_required
  from: calendar_fetched
  to: awaiting_auth
  if: ${{ state.requiresAuthentication }}
  call:
    - tool: executeWorkflowAsync
      id: launchAuth
      args:
        workflow: oauth
        args:
          provider: 'google'
          scopes:
            - 'https://www.googleapis.com/auth/calendar.readonly'
        callback:
          transition: auth_completed

    - tool: createDocument
      args:
        id: authStatus
        document: linkDocument
        update:
          content:
            icon: 'LockKeyhole'
            label: 'Google authentication required'
            caption: 'Complete sign-in to continue'
            href: '/pipelines/{{ runtime.tools.auth_required.launchAuth.data.task.pipelineId }}'
            embed: true
            expanded: true
```

### 3. Automatic Retry

When the OAuth sub-workflow completes, the event system triggers `auth_completed` on the parent, which transitions back to `start` — automatically re-fetching the calendar events with the now-valid token:

```yaml
- id: auth_completed
  from: awaiting_auth
  to: start
  trigger: manual
```

## Dependencies

This example uses the following Loopstack modules:

- `@loopstack/core` — Core framework functionality including `ExecuteWorkflowAsync`
- `@loopstack/oauth-module` — OAuth infrastructure (`OAuthTokenStore`, `OAuthWorkflow`)
- `@loopstack/core-ui-module` — Provides `CreateDocument`, `LinkDocument`, and `MarkdownDocument`
- `@loopstack/create-chat-message-tool` — Provides `CreateChatMessage`

A Google OAuth provider module (implementing `OAuthProviderInterface`) is also required.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
