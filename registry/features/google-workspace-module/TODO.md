# Google Workspace Module — Implementation Plan

This document describes the tools to be implemented in `@loopstack/google-workspace-module`. All tools follow the same pattern as the existing `GoogleCalendarFetchEventsTool` in the example module — check `OAuthTokenStore.getValidAccessToken(userId, 'google')`, return `{ error: 'unauthorized' }` if no token, otherwise call the Google API and return structured data.

The example module (`@loopstack/google-oauth-calendar-example`) currently contains `GoogleCalendarFetchEventsTool`. Once the tools below are implemented here, the example tool will be replaced by the ones from this module.

---

## Google Calendar

### Scopes

- `https://www.googleapis.com/auth/calendar.readonly` — read operations
- `https://www.googleapis.com/auth/calendar.events` — read + write events

### Tools

#### `GoogleCalendarListCalendars`

List all calendars the authenticated user has access to.

- **API:** `GET https://www.googleapis.com/calendar/v3/users/me/calendarList`
- **Args:** none (optional `showHidden: boolean`)
- **Returns:** `{ calendars: Array<{ id, summary, description, primary, timeZone }> }`

#### `GoogleCalendarFetchEvents`

Fetch events from a calendar within a time range.

- **API:** `GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`
- **Args:**
  - `calendarId: string` (default: `'primary'`)
  - `timeMin: string` (ISO 8601)
  - `timeMax: string` (ISO 8601)
  - `maxResults?: number`
  - `query?: string` (free-text search via `q` parameter)
- **Query params:** `singleEvents=true`, `orderBy=startTime`
- **Returns:** `{ events: Array<{ id, summary, description, start, end, location, attendees, htmlLink }> }`

#### `GoogleCalendarCreateEvent`

Create a new calendar event.

- **API:** `POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`
- **Args:**
  - `calendarId?: string` (default: `'primary'`)
  - `summary: string`
  - `description?: string`
  - `start: string` (ISO 8601)
  - `end: string` (ISO 8601)
  - `location?: string`
  - `attendees?: Array<{ email: string }>`
  - `reminders?: { useDefault: boolean, overrides?: Array<{ method: string, minutes: number }> }`
- **Returns:** `{ event: { id, summary, start, end, htmlLink } }`

---

## Gmail

### Scopes

- `https://www.googleapis.com/auth/gmail.readonly` — read operations
- `https://www.googleapis.com/auth/gmail.send` — send only
- `https://www.googleapis.com/auth/gmail.modify` — read + write + label management

### Tools

#### `GmailSearchMessages`

Search and list messages using Gmail query syntax.

- **API:** `GET https://www.googleapis.com/gmail/v1/users/me/messages`
- **Args:**
  - `query?: string` (Gmail search syntax, e.g. `from:alice subject:report after:2025/01/01`)
  - `labelIds?: string[]` (e.g. `['INBOX']`, `['SENT']`)
  - `maxResults?: number` (default: 10)
  - `pageToken?: string`
- **Note:** This endpoint returns only message IDs. Each message needs a follow-up fetch for content. Consider doing a batch fetch internally (up to `maxResults`) and returning snippet + headers for each, to avoid requiring a separate `GmailGetMessage` call for every result.
- **Returns:** `{ messages: Array<{ id, threadId, snippet, from, to, subject, date }>, nextPageToken? }`

#### `GmailGetMessage`

Get the full content of a single message.

- **API:** `GET https://www.googleapis.com/gmail/v1/users/me/messages/{id}`
- **Args:**
  - `messageId: string`
  - `format?: 'full' | 'metadata' | 'minimal'` (default: `'full'`)
- **Note:** Parse the MIME payload to extract plain text body (or HTML body). Extract headers (`From`, `To`, `Cc`, `Subject`, `Date`). List attachments with their `attachmentId`, `filename`, and `mimeType` without downloading them.
- **Returns:** `{ id, threadId, from, to, cc, subject, date, body, snippet, labelIds, attachments: Array<{ attachmentId, filename, mimeType, size }> }`

#### `GmailSendMessage`

Send a new email.

- **API:** `POST https://www.googleapis.com/gmail/v1/users/me/messages/send`
- **Args:**
  - `to: string[]`
  - `cc?: string[]`
  - `bcc?: string[]`
  - `subject: string`
  - `body: string` (plain text)
  - `htmlBody?: string`
- **Note:** The API expects a base64url-encoded RFC 2822 message. Build the MIME message from the args (set `Content-Type: text/plain` or `multipart/alternative` if `htmlBody` is provided).
- **Returns:** `{ id, threadId, labelIds }`

#### `GmailReplyToMessage`

Reply to an existing message (in-thread).

- **API:** `POST https://www.googleapis.com/gmail/v1/users/me/messages/send`
- **Args:**
  - `messageId: string` (the message being replied to)
  - `threadId: string`
  - `body: string` (plain text)
  - `htmlBody?: string`
  - `replyAll?: boolean` (default: `false`)
- **Note:** Fetch the original message to get `From`, `To`, `Cc`, `Subject`, and `Message-ID` headers. Set `In-Reply-To` and `References` headers. Prefix subject with `Re:` if not already present. If `replyAll`, include all original recipients.
- **Returns:** `{ id, threadId, labelIds }`

---

## Google Drive

### Scopes

- `https://www.googleapis.com/auth/drive.readonly` — read operations
- `https://www.googleapis.com/auth/drive.file` — access only to files created by the app
- `https://www.googleapis.com/auth/drive` — full read + write access

### Tools

#### `GoogleDriveListFiles`

List and search files in Google Drive.

- **API:** `GET https://www.googleapis.com/drive/v3/files`
- **Args:**
  - `query?: string` (Drive query syntax, e.g. `name contains 'report' and mimeType = 'application/pdf'`)
  - `folderId?: string` (list contents of a specific folder — translates to `'<folderId>' in parents`)
  - `maxResults?: number` (default: 20, maps to `pageSize`)
  - `pageToken?: string`
  - `orderBy?: string` (e.g. `'modifiedTime desc'`, `'name'`)
- **Query params:** `fields=files(id,name,mimeType,size,modifiedTime,createdTime,owners,webViewLink,parents)`
- **Returns:** `{ files: Array<{ id, name, mimeType, size, modifiedTime, createdTime, owners, webViewLink }>, nextPageToken? }`

#### `GoogleDriveGetFileMetadata`

Get detailed metadata for a single file.

- **API:** `GET https://www.googleapis.com/drive/v3/files/{fileId}`
- **Args:**
  - `fileId: string`
- **Query params:** `fields=id,name,mimeType,size,modifiedTime,createdTime,owners,webViewLink,parents,description,shared,permissions`
- **Returns:** `{ id, name, mimeType, size, modifiedTime, createdTime, owners, webViewLink, parents, description, shared }`

#### `GoogleDriveDownloadFile`

Download or export file content.

- **API (binary files):** `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media`
- **API (Google Docs/Sheets/Slides export):** `GET https://www.googleapis.com/drive/v3/files/{fileId}/export`
- **Args:**
  - `fileId: string`
  - `exportMimeType?: string`
- **Note:** If the file is a Google Workspace document (Docs, Sheets, Slides), use the export endpoint. Default export formats:
  - `application/vnd.google-apps.document` → `text/plain`
  - `application/vnd.google-apps.spreadsheet` → `text/csv`
  - `application/vnd.google-apps.presentation` → `text/plain`
  - The caller can override via `exportMimeType` (e.g. `application/pdf`)
  - For binary files (PDFs, images, etc.), use `alt=media` directly.
- **Returns:** `{ content: string, mimeType: string }` (text content) or `{ content: string, mimeType: string, encoding: 'base64' }` (binary content)

#### `GoogleDriveUploadFile`

Upload a new file to Google Drive.

- **API:** `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
- **Args:**
  - `name: string`
  - `content: string`
  - `mimeType?: string` (default: `'text/plain'`)
  - `folderId?: string` (parent folder ID)
  - `description?: string`
- **Note:** Use multipart upload — first part is JSON metadata (`name`, `parents`, `description`), second part is file content. For text content this is straightforward. Binary upload (base64-encoded input) can be added later.
- **Returns:** `{ id, name, mimeType, webViewLink }`

---

## Implementation Notes

- All tools inject `OAuthTokenStore` and call `getValidAccessToken(ctx.userId, 'google')`. If `undefined`, return `{ error: 'unauthorized', message: '...' }`. This allows workflows to detect the missing token and launch the OAuth sub-workflow.
- All tools use the `@Tool` decorator with a `config.description` and define args via `@Input` with a zod schema.
- Token refresh is handled transparently by `OAuthTokenStore.getValidAccessToken()` — it checks expiry and calls `GoogleWorkspaceOAuthProvider.refreshToken()` automatically.
- Handle `401`/`403` responses from Google APIs by returning `{ error: '401', message: '...' }` so workflows can re-trigger authentication.
- Use `fetch()` for all HTTP calls (no additional dependencies needed).
- Return clean, structured data — strip internal Google API noise and return only fields useful to workflows.
