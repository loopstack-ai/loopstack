---
title: API: @loopstack/google-workspace-module
description: Public API reference for @loopstack/google-workspace-module
includeInLlmsFullTxt: false
---

# API: @loopstack/google-workspace-module

## Classes

### GmailGetMessageTool

Tool that gets the full content of a single Gmail message. Takes a `messageId` and `format`, and
returns headers, decoded body text, snippet, label ids, and attachment metadata, or
`{ error: 'unauthorized' }` when no valid Google token is available.

```ts
import { GmailGetMessageTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GmailGetMessageTool extends BaseTool<GmailGetMessageArgs, object, GmailGetMessageResult> {
  protected handle(args: GmailGetMessageArgs, ctx: RunContext): Promise<ToolEnvelope<GmailGetMessageResult>>;
}
```

### GmailReplyToMessageTool

Tool that replies to an existing Gmail message in-thread. Fetches the original message to set
proper reply headers, supports `replyAll`, and returns the sent reply's id, thread id, and label
ids, or `{ error: 'unauthorized' }` when no valid Google token is available.

```ts
import { GmailReplyToMessageTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GmailReplyToMessageTool extends BaseTool<GmailReplyToMessageArgs, object, GmailReplyToMessageResult> {
  protected handle(args: GmailReplyToMessageArgs, ctx: RunContext): Promise<ToolEnvelope<GmailReplyToMessageResult>>;
}
```

### GmailSearchMessagesTool

Tool that searches Gmail messages using Gmail query syntax. Takes a `query`, optional `labelIds`,
and pagination, and returns message summaries with headers and snippets plus a `nextPageToken`, or
`{ error: 'unauthorized' }` when no valid Google token is available.

```ts
import { GmailSearchMessagesTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GmailSearchMessagesTool extends BaseTool<GmailSearchMessagesArgs, object, GmailSearchMessagesResult> {
  protected handle(args: GmailSearchMessagesArgs, ctx: RunContext): Promise<ToolEnvelope<GmailSearchMessagesResult>>;
}
```

### GmailSendMessageTool

Tool that sends a new email via Gmail. Takes `to`/`cc`/`bcc` recipients, a subject, and plain-text
(and optional HTML) body, and returns the sent message's id, thread id, and label ids, or
`{ error: 'unauthorized' }` when no valid Google token is available.

```ts
import { GmailSendMessageTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GmailSendMessageTool extends BaseTool<GmailSendMessageArgs, object, GmailSendMessageResult> {
  protected handle(args: GmailSendMessageArgs, ctx: RunContext): Promise<ToolEnvelope<GmailSendMessageResult>>;
}
```

### GoogleCalendarCreateEventTool

Tool that creates a new event on a Google Calendar. Takes a summary, start/end times, and optional
description, location, attendees, and reminders, and returns the created event's id and link, or
`{ error: 'unauthorized' }` when no valid Google token is available.

```ts
import { GoogleCalendarCreateEventTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GoogleCalendarCreateEventTool extends BaseTool<
  GoogleCalendarCreateEventArgs,
  object,
  GoogleCalendarCreateEventResult
> {
  protected handle(
    args: GoogleCalendarCreateEventArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GoogleCalendarCreateEventResult>>;
}
```

### GoogleCalendarFetchEventsTool

Tool that fetches events from a Google Calendar within a time range. Takes a `timeMin`/`timeMax`
window (and optional `calendarId`, `query`, `maxResults`) and returns matching events with
start/end, attendees, and links, or `{ error: 'unauthorized' }` when no valid Google token is available.

```ts
import { GoogleCalendarFetchEventsTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GoogleCalendarFetchEventsTool extends BaseTool<
  GoogleCalendarFetchEventsArgs,
  object,
  GoogleCalendarFetchEventsResult
> {
  protected handle(
    args: GoogleCalendarFetchEventsArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GoogleCalendarFetchEventsResult>>;
}
```

### GoogleCalendarListCalendarsTool

Tool that lists all Google Calendars the authenticated user has access to. Returns each
calendar's id, summary, time zone, and primary flag, or `{ error: 'unauthorized' }` when no
valid Google token is available.

```ts
import { GoogleCalendarListCalendarsTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GoogleCalendarListCalendarsTool extends BaseTool<
  GoogleCalendarListCalendarsArgs,
  object,
  GoogleCalendarListCalendarsResult
> {
  protected handle(
    args: GoogleCalendarListCalendarsArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GoogleCalendarListCalendarsResult>>;
}
```

### GoogleDriveDownloadFileTool

Tool that downloads or exports a file from Google Drive. Takes a `fileId` and optional
`exportMimeType`, automatically handles Google Docs/Sheets/Slides export, and returns text or
base64-encoded content with its mime type, or `{ error: 'unauthorized' }` when no valid Google
token is available.

```ts
import { GoogleDriveDownloadFileTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GoogleDriveDownloadFileTool extends BaseTool<
  GoogleDriveDownloadFileArgs,
  object,
  GoogleDriveDownloadFileResult
> {
  protected handle(
    args: GoogleDriveDownloadFileArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GoogleDriveDownloadFileResult>>;
}
```

### GoogleDriveGetFileMetadataTool

Tool that gets detailed metadata for a single Google Drive file. Takes a `fileId` and returns
name, mime type, size, timestamps, owners, parents, and sharing state, or
`{ error: 'unauthorized' }` when no valid Google token is available.

```ts
import { GoogleDriveGetFileMetadataTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GoogleDriveGetFileMetadataTool extends BaseTool<
  GoogleDriveGetFileMetadataArgs,
  object,
  GoogleDriveGetFileMetadataResult
> {
  protected handle(
    args: GoogleDriveGetFileMetadataArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GoogleDriveGetFileMetadataResult>>;
}
```

### GoogleDriveListFilesTool

Tool that lists and searches files in Google Drive. Supports Drive query syntax, folder browsing,
ordering, and pagination, and returns file metadata plus a `nextPageToken`, or
`{ error: 'unauthorized' }` when no valid Google token is available.

```ts
import { GoogleDriveListFilesTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GoogleDriveListFilesTool extends BaseTool<GoogleDriveListFilesArgs, object, GoogleDriveListFilesResult> {
  protected handle(args: GoogleDriveListFilesArgs, ctx: RunContext): Promise<ToolEnvelope<GoogleDriveListFilesResult>>;
}
```

### GoogleDriveUploadFileTool

Tool that uploads a new file to Google Drive using multipart upload. Takes a name, content, mime
type, and optional folder and description, and returns the created file's id, name, and link, or
`{ error: 'unauthorized' }` when no valid Google token is available.

```ts
import { GoogleDriveUploadFileTool } from '@loopstack/google-workspace-module';
```

**Provided by:** `GoogleWorkspaceModule`

```ts
export class GoogleDriveUploadFileTool extends BaseTool<
  GoogleDriveUploadFileArgs,
  object,
  GoogleDriveUploadFileResult
> {
  protected handle(
    args: GoogleDriveUploadFileArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GoogleDriveUploadFileResult>>;
}
```

### GoogleWorkspaceModule

NestJS module that provides the Google OAuth 2.0 provider and 11 Google Workspace tools
(Calendar, Gmail, and Drive) for use in workflows and agents.

Registration:

- `GoogleWorkspaceModule` — a bare import is enough. It imports `OAuthModule` internally and
  registers `GoogleWorkspaceOAuthProvider` (provider id `'google'`) plus all Calendar, Gmail,
  and Drive tools as providers, so they are resolvable by DI with no static configuration method.

Requires: Google OAuth client credentials in the environment — `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` are mandatory (optionally `GOOGLE_OAUTH_REDIRECT_URI`, defaults to
`/oauth/callback`). Without them the OAuth flow cannot authenticate and tools return
`{ error: 'unauthorized' }`.

```ts
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';
```

```ts
export class GoogleWorkspaceModule {}
```

## Type Aliases

### GmailGetMessageArgs

Args for `GmailGetMessageTool`.

```ts
import { GmailGetMessageArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GmailGetMessageArgs = z.infer<typeof inputSchema>;
```

### GmailGetMessageResult

Result for `GmailGetMessageTool`.

```ts
import { GmailGetMessageResult } from '@loopstack/google-workspace-module';
```

```ts
export type GmailGetMessageResult =
  | {
      id: string;
      threadId: string;
      from: string;
      to: string;
      cc: string;
      subject: string;
      date: string;
      body: string;
      snippet: string;
      labelIds: string[];
      attachments: Array<{
        attachmentId: string;
        filename: string;
        mimeType: string;
        size: number;
      }>;
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```

### GmailReplyToMessageArgs

Args for `GmailReplyToMessageTool`.

```ts
import { GmailReplyToMessageArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GmailReplyToMessageArgs = z.infer<typeof inputSchema>;
```

### GmailReplyToMessageResult

Result for `GmailReplyToMessageTool`.

```ts
import { GmailReplyToMessageResult } from '@loopstack/google-workspace-module';
```

```ts
export type GmailReplyToMessageResult =
  | {
      id: string;
      threadId: string;
      labelIds: string[];
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```

### GmailSearchMessagesArgs

Args for `GmailSearchMessagesTool`.

```ts
import { GmailSearchMessagesArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GmailSearchMessagesArgs = z.infer<typeof inputSchema>;
```

### GmailSearchMessagesResult

Result for `GmailSearchMessagesTool`.

```ts
import { GmailSearchMessagesResult } from '@loopstack/google-workspace-module';
```

```ts
export type GmailSearchMessagesResult =
  | {
      messages: Array<{
        id: string;
        threadId: string;
        snippet: string;
        from: string;
        to: string;
        subject: string;
        date: string;
      }>;
      nextPageToken?: string;
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```

### GmailSendMessageArgs

Args for `GmailSendMessageTool`.

```ts
import { GmailSendMessageArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GmailSendMessageArgs = z.infer<typeof inputSchema>;
```

### GmailSendMessageResult

Result for `GmailSendMessageTool`.

```ts
import { GmailSendMessageResult } from '@loopstack/google-workspace-module';
```

```ts
export type GmailSendMessageResult =
  | {
      id: string;
      threadId: string;
      labelIds: string[];
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```

### GoogleCalendarCreateEventArgs

Args for `GoogleCalendarCreateEventTool`.

```ts
import { GoogleCalendarCreateEventArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleCalendarCreateEventArgs = z.infer<typeof inputSchema>;
```

### GoogleCalendarCreateEventResult

Result for `GoogleCalendarCreateEventTool`.

```ts
import { GoogleCalendarCreateEventResult } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleCalendarCreateEventResult =
  | {
      event: {
        id: string;
        summary: string;
        start: string | undefined;
        end: string | undefined;
        htmlLink: string;
      };
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```

### GoogleCalendarFetchEventsArgs

Args for `GoogleCalendarFetchEventsTool`.

```ts
import { GoogleCalendarFetchEventsArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleCalendarFetchEventsArgs = z.infer<typeof inputSchema>;
```

### GoogleCalendarFetchEventsResult

Result for `GoogleCalendarFetchEventsTool`.

```ts
import { GoogleCalendarFetchEventsResult } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleCalendarFetchEventsResult = {
  events?: Array<{
    id: string;
    summary?: string;
    description?: string;
    start: string | undefined;
    end: string | undefined;
    location?: string;
    attendees?: Array<{
      email: string;
      responseStatus?: string;
    }>;
    htmlLink?: string;
  }>;
  error?: string;
  message?: string;
};
```

### GoogleCalendarListCalendarsArgs

Args for `GoogleCalendarListCalendarsTool`.

```ts
import { GoogleCalendarListCalendarsArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleCalendarListCalendarsArgs = z.infer<typeof inputSchema>;
```

### GoogleCalendarListCalendarsResult

Result for `GoogleCalendarListCalendarsTool`.

```ts
import { GoogleCalendarListCalendarsResult } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleCalendarListCalendarsResult =
  | {
      calendars: Array<{
        id: string;
        summary: string;
        description?: string;
        primary: boolean;
        timeZone?: string;
      }>;
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```

### GoogleDriveDownloadFileArgs

Args for `GoogleDriveDownloadFileTool`.

```ts
import { GoogleDriveDownloadFileArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleDriveDownloadFileArgs = z.infer<typeof inputSchema>;
```

### GoogleDriveDownloadFileResult

Result for `GoogleDriveDownloadFileTool`.

```ts
import { GoogleDriveDownloadFileResult } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleDriveDownloadFileResult =
  | {
      content: string;
      mimeType: string;
    }
  | {
      content: string;
      mimeType: string;
      encoding: 'base64';
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```

### GoogleDriveGetFileMetadataArgs

Args for `GoogleDriveGetFileMetadataTool`.

```ts
import { GoogleDriveGetFileMetadataArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleDriveGetFileMetadataArgs = z.infer<typeof inputSchema>;
```

### GoogleDriveGetFileMetadataResult

Result for `GoogleDriveGetFileMetadataTool`.

```ts
import { GoogleDriveGetFileMetadataResult } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleDriveGetFileMetadataResult =
  | {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      modifiedTime: string;
      createdTime: string;
      owners?: Array<{
        displayName: string;
        email: string;
      }>;
      webViewLink?: string;
      parents?: string[];
      description?: string;
      shared?: boolean;
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```

### GoogleDriveListFilesArgs

Args for `GoogleDriveListFilesTool`.

```ts
import { GoogleDriveListFilesArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleDriveListFilesArgs = z.infer<typeof inputSchema>;
```

### GoogleDriveListFilesResult

Result for `GoogleDriveListFilesTool`.

```ts
import { GoogleDriveListFilesResult } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleDriveListFilesResult =
  | {
      files: Array<{
        id: string;
        name: string;
        mimeType: string;
        size?: string;
        modifiedTime: string;
        createdTime: string;
        owners?: Array<{
          displayName: string;
          email: string;
        }>;
        webViewLink?: string;
      }>;
      nextPageToken?: string;
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```

### GoogleDriveUploadFileArgs

Args for `GoogleDriveUploadFileTool`.

```ts
import { GoogleDriveUploadFileArgs } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleDriveUploadFileArgs = z.infer<typeof inputSchema>;
```

### GoogleDriveUploadFileResult

Result for `GoogleDriveUploadFileTool`.

```ts
import { GoogleDriveUploadFileResult } from '@loopstack/google-workspace-module';
```

```ts
export type GoogleDriveUploadFileResult =
  | {
      id: string;
      name: string;
      mimeType: string;
      webViewLink?: string;
    }
  | {
      error: 'unauthorized';
      message: string;
    }
  | {
      error: 'api_error';
      message: string;
    };
```
