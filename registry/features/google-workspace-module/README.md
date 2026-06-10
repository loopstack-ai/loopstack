---
title: Google Workspace Module
description: Google Calendar, Gmail, and Drive tools for Loopstack — 11 tools across 3 domains, Google OAuth provider, OAuthProviderInterface, token-based API access with automatic unauthorized error handling
---

# @loopstack/google-workspace-module

> Google Workspace integration module for the [Loopstack](https://loopstack.ai) automation framework.

Provides a Google OAuth 2.0 provider and 11 tools for interacting with Google Calendar, Gmail, and Drive. Registers a Google OAuth provider with `@loopstack/oauth-module` so any workflow can authenticate users via their Google account.

## When to Use

- **Your workflow needs to read or create calendar events** — use the Calendar tools.
- **Your workflow needs to search, read, or send emails** — use the Gmail tools.
- **Your workflow needs to browse, download, or upload files in Google Drive** — use the Drive tools.
- **You're building an agent that works across Google services** — register all tools and let the LLM pick the right one.

## Installation

```bash
npm install @loopstack/google-workspace-module
```

Register the module alongside `OAuthModule`:

```typescript
import { Module } from '@nestjs/common';
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';
import { OAuthModule } from '@loopstack/oauth-module';

@Module({
  imports: [OAuthModule, GoogleWorkspaceModule],
  providers: [MyWorkflow],
})
export class MyModule {}
```

### Environment Variables

| Variable                    | Required | Default           | Description                |
| --------------------------- | -------- | ----------------- | -------------------------- |
| `GOOGLE_CLIENT_ID`          | yes      | —                 | Google OAuth client ID     |
| `GOOGLE_CLIENT_SECRET`      | yes      | —                 | Google OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | no       | `/oauth/callback` | OAuth redirect URI         |

Obtain credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

## Quick Start

Use Google tools in an agent workflow:

```typescript
import { AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, LinkDocument, Transition, Workflow } from '@loopstack/common';

@Workflow({ title: 'Google Assistant' })
export class GoogleAssistantWorkflow extends BaseWorkflow {
  constructor(private readonly agent: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'chatting' })
  async start(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.agent.run(
      {
        system: 'You are a Google Workspace assistant with access to Calendar, Gmail, and Drive.',
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
        ],
        userMessage: 'Summarize my calendar events for today.',
      },
      { callback: { transition: 'agentDone' } },
    );

    await this.documentStore.save(
      LinkDocument,
      { label: 'Working...', workflowId: result.workflowId, embed: true, expanded: true },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }
}
```

All tools return `{ error: 'unauthorized' }` when no valid token is available, so your workflow can trigger authentication on demand.

## How It Works

### Provider Registration

`GoogleWorkspaceOAuthProvider` implements `OAuthProviderInterface` and registers itself with the `OAuthProviderRegistry` at startup. After that, the generic `OAuthWorkflow` from `@loopstack/oauth-module` handles `provider: 'google'` automatically.

| Property        | Value                                |
| --------------- | ------------------------------------ |
| `providerId`    | `'google'`                           |
| `defaultScopes` | `userinfo.email`, `userinfo.profile` |

Additional scopes (Calendar, Gmail, Drive) should be requested when launching the OAuth flow depending on which tools your workflow uses.

### Authentication Pattern

Tools check for a valid OAuth token via `OAuthTokenStore`. When no token exists (or it's expired), the tool returns `{ error: 'unauthorized' }`. Your workflow should catch this and launch the OAuth flow:

```typescript
const result = await this.oAuth.run(
  { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
  { callback: { transition: 'authCompleted' } },
);
```

See the `google-oauth-example` for a complete implementation of this pattern.

## Tools Reference

### Calendar

#### `google_calendar_list_calendars`

Lists all calendars the authenticated user has access to.

| Arg          | Type      | Required | Description              |
| ------------ | --------- | -------- | ------------------------ |
| `showHidden` | `boolean` | no       | Include hidden calendars |

#### `google_calendar_fetch_events`

Fetches events from a calendar within a time range.

| Arg          | Type     | Required | Description                        |
| ------------ | -------- | -------- | ---------------------------------- |
| `calendarId` | `string` | no       | Calendar ID (default: `'primary'`) |
| `timeMin`    | `string` | yes      | Start of range (ISO 8601)          |
| `timeMax`    | `string` | yes      | End of range (ISO 8601)            |
| `maxResults` | `number` | no       | Maximum events to return           |
| `query`      | `string` | no       | Free-text search within events     |

#### `google_calendar_create_event`

Creates a new calendar event.

| Arg           | Type                  | Required | Description                        |
| ------------- | --------------------- | -------- | ---------------------------------- |
| `calendarId`  | `string`              | no       | Calendar ID (default: `'primary'`) |
| `summary`     | `string`              | yes      | Event title                        |
| `description` | `string`              | no       | Event description                  |
| `start`       | `string`              | yes      | Start time (ISO 8601)              |
| `end`         | `string`              | yes      | End time (ISO 8601)                |
| `location`    | `string`              | no       | Event location                     |
| `attendees`   | `{ email: string }[]` | no       | Attendee list                      |
| `reminders`   | `object`              | no       | Reminder overrides                 |

### Gmail

#### `gmail_search_messages`

Searches Gmail messages using Gmail query syntax.

| Arg          | Type       | Required | Description                                                |
| ------------ | ---------- | -------- | ---------------------------------------------------------- |
| `query`      | `string`   | no       | Gmail query (e.g. `from:user@example.com subject:invoice`) |
| `labelIds`   | `string[]` | no       | Filter by label IDs                                        |
| `maxResults` | `number`   | no       | Max results (default: `10`)                                |
| `pageToken`  | `string`   | no       | Pagination token                                           |

#### `gmail_get_message`

Gets full content of a single message including body and attachment metadata.

| Arg         | Type                                | Required | Description                         |
| ----------- | ----------------------------------- | -------- | ----------------------------------- |
| `messageId` | `string`                            | yes      | Message ID                          |
| `format`    | `'full' \| 'metadata' \| 'minimal'` | no       | Response format (default: `'full'`) |

#### `gmail_send_message`

Sends a new email.

| Arg        | Type       | Required | Description           |
| ---------- | ---------- | -------- | --------------------- |
| `to`       | `string[]` | yes      | Recipient emails      |
| `cc`       | `string[]` | no       | CC recipients         |
| `bcc`      | `string[]` | no       | BCC recipients        |
| `subject`  | `string`   | yes      | Email subject         |
| `body`     | `string`   | yes      | Plain text body       |
| `htmlBody` | `string`   | no       | HTML alternative body |

#### `gmail_reply_to_message`

Replies to an existing message in-thread.

| Arg         | Type      | Required | Description                                |
| ----------- | --------- | -------- | ------------------------------------------ |
| `messageId` | `string`  | yes      | Message ID to reply to                     |
| `threadId`  | `string`  | yes      | Thread ID                                  |
| `body`      | `string`  | yes      | Plain text body                            |
| `htmlBody`  | `string`  | no       | HTML alternative body                      |
| `replyAll`  | `boolean` | no       | Reply to all recipients (default: `false`) |

### Drive

#### `google_drive_list_files`

Lists and searches files. Supports Drive query syntax and folder browsing.

| Arg          | Type     | Required | Description                      |
| ------------ | -------- | -------- | -------------------------------- |
| `query`      | `string` | no       | Drive query syntax               |
| `folderId`   | `string` | no       | Folder ID to search within       |
| `maxResults` | `number` | no       | Max results (default: `20`)      |
| `pageToken`  | `string` | no       | Pagination token                 |
| `orderBy`    | `string` | no       | Sort order (e.g. `modifiedTime`) |

#### `google_drive_get_file_metadata`

Gets detailed metadata for a single file.

| Arg      | Type     | Required | Description |
| -------- | -------- | -------- | ----------- |
| `fileId` | `string` | yes      | File ID     |

#### `google_drive_download_file`

Downloads or exports a file. Automatically handles Google Docs/Sheets/Slides export.

| Arg              | Type     | Required | Description                                       |
| ---------------- | -------- | -------- | ------------------------------------------------- |
| `fileId`         | `string` | yes      | File ID                                           |
| `exportMimeType` | `string` | no       | Export format for Google Docs (e.g. `text/plain`) |

#### `google_drive_upload_file`

Uploads a new file using multipart upload.

| Arg           | Type     | Required | Description                       |
| ------------- | -------- | -------- | --------------------------------- |
| `name`        | `string` | yes      | Filename                          |
| `content`     | `string` | yes      | File content                      |
| `mimeType`    | `string` | no       | MIME type (default: `text/plain`) |
| `folderId`    | `string` | no       | Parent folder ID                  |
| `description` | `string` | no       | File description                  |

## Public API

- **Module:** `GoogleWorkspaceModule`
- **Provider:** `GoogleWorkspaceOAuthProvider`
- **Calendar Tools:** `GoogleCalendarListCalendarsTool`, `GoogleCalendarFetchEventsTool`, `GoogleCalendarCreateEventTool`
- **Gmail Tools:** `GmailSearchMessagesTool`, `GmailGetMessageTool`, `GmailSendMessageTool`, `GmailReplyToMessageTool`
- **Drive Tools:** `GoogleDriveListFilesTool`, `GoogleDriveGetFileMetadataTool`, `GoogleDriveDownloadFileTool`, `GoogleDriveUploadFileTool`

## Dependencies

- `@loopstack/oauth-module` — `OAuthProviderRegistry`, `OAuthProviderInterface`, `OAuthTokenStore`

## Related

- [OAuth Integration](https://loopstack.ai/docs/build/integrations/oauth) — OAuth flow patterns and token management
- [google-oauth-example](https://loopstack.ai/registry/loopstack-google-oauth-example) — full example with agent workflow, Calendar/Gmail/Drive tools, and authentication handling

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
