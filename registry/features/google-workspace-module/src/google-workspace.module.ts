import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { GoogleWorkspaceOAuthProvider } from './google-workspace-oauth.provider';
import { GoogleCalendarCreateEventTool } from './tools/calendar/google-calendar-create-event.tool';
import { GoogleCalendarFetchEventsTool } from './tools/calendar/google-calendar-fetch-events.tool';
import { GoogleCalendarListCalendarsTool } from './tools/calendar/google-calendar-list-calendars.tool';
import { GoogleDriveDownloadFileTool } from './tools/drive/google-drive-download-file.tool';
import { GoogleDriveGetFileMetadataTool } from './tools/drive/google-drive-get-file-metadata.tool';
import { GoogleDriveListFilesTool } from './tools/drive/google-drive-list-files.tool';
import { GoogleDriveUploadFileTool } from './tools/drive/google-drive-upload-file.tool';
import { GmailGetMessageTool } from './tools/gmail/gmail-get-message.tool';
import { GmailReplyToMessageTool } from './tools/gmail/gmail-reply-to-message.tool';
import { GmailSearchMessagesTool } from './tools/gmail/gmail-search-messages.tool';
import { GmailSendMessageTool } from './tools/gmail/gmail-send-message.tool';

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
