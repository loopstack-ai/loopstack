import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { GoogleWorkspaceOAuthProvider } from './google-workspace-oauth.provider.js';
import { GoogleCalendarCreateEventTool } from './tools/calendar/google-calendar-create-event.tool.js';
import { GoogleCalendarFetchEventsTool } from './tools/calendar/google-calendar-fetch-events.tool.js';
import { GoogleCalendarListCalendarsTool } from './tools/calendar/google-calendar-list-calendars.tool.js';
import { GoogleDriveDownloadFileTool } from './tools/drive/google-drive-download-file.tool.js';
import { GoogleDriveGetFileMetadataTool } from './tools/drive/google-drive-get-file-metadata.tool.js';
import { GoogleDriveListFilesTool } from './tools/drive/google-drive-list-files.tool.js';
import { GoogleDriveUploadFileTool } from './tools/drive/google-drive-upload-file.tool.js';
import { GmailGetMessageTool } from './tools/gmail/gmail-get-message.tool.js';
import { GmailReplyToMessageTool } from './tools/gmail/gmail-reply-to-message.tool.js';
import { GmailSearchMessagesTool } from './tools/gmail/gmail-search-messages.tool.js';
import { GmailSendMessageTool } from './tools/gmail/gmail-send-message.tool.js';

const tools = [
  GoogleCalendarListCalendarsTool,
  GoogleCalendarFetchEventsTool,
  GoogleCalendarCreateEventTool,
  GmailSearchMessagesTool,
  GmailGetMessageTool,
  GmailSendMessageTool,
  GmailReplyToMessageTool,
  GoogleDriveListFilesTool,
  GoogleDriveGetFileMetadataTool,
  GoogleDriveDownloadFileTool,
  GoogleDriveUploadFileTool,
];

/**
 * NestJS module that provides the Google OAuth 2.0 provider and 11 Google Workspace tools
 * (Calendar, Gmail, and Drive) for use in workflows and agents.
 *
 * Registration:
 * - `GoogleWorkspaceModule` — a bare import is enough. It imports `OAuthModule` internally and
 *   registers `GoogleWorkspaceOAuthProvider` (provider id `'google'`) plus all Calendar, Gmail,
 *   and Drive tools as providers, so they are resolvable by DI with no static configuration method.
 *
 * Requires: Google OAuth client credentials in the environment — `GOOGLE_CLIENT_ID` and
 * `GOOGLE_CLIENT_SECRET` are mandatory (optionally `GOOGLE_OAUTH_REDIRECT_URI`, defaults to
 * `/oauth/callback`). Without them the OAuth flow cannot authenticate and tools return
 * `{ error: 'unauthorized' }`.
 *
 * @public
 */
@Module({
  imports: [OAuthModule],
  providers: [GoogleWorkspaceOAuthProvider, ...tools],
  exports: [GoogleWorkspaceOAuthProvider, ...tools],
})
export class GoogleWorkspaceModule {}
