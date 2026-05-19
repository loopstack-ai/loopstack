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

@Module({
  imports: [OAuthModule],
  providers: [GoogleWorkspaceOAuthProvider, ...tools],
  exports: [GoogleWorkspaceOAuthProvider, ...tools],
})
export class GoogleWorkspaceModule {}
