import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ClaudeGenerateText,
  ClaudeMessageDocument,
  DelegateToolCalls,
  UpdateToolResult,
} from '@loopstack/claude-module';
import {
  InjectDocument,
  InjectTool,
  InjectWorkflow,
  Runtime,
  State,
  Workflow,
  WorkflowInterface,
} from '@loopstack/common';
import { CreateDocument, LinkDocument, Task } from '@loopstack/core';
import {
  GmailGetMessageTool,
  GmailReplyToMessageTool,
  GmailSearchMessagesTool,
  GmailSendMessageTool,
  GoogleCalendarCreateEventTool,
  GoogleCalendarFetchEventsTool,
  GoogleCalendarListCalendarsTool,
  GoogleDriveDownloadFileTool,
  GoogleDriveGetFileMetadataTool,
  GoogleDriveListFilesTool,
  GoogleDriveUploadFileTool,
} from '@loopstack/google-workspace-module';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { AuthenticateGoogleTask } from '../tools/authenticate-google-task.tool';

@Injectable()
@Workflow({
  configFile: __dirname + '/google-workspace-agent.workflow.yaml',
})
export class GoogleWorkspaceAgentWorkflow implements WorkflowInterface {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;
  @InjectTool() task: Task;
  @InjectTool() authenticateGoogle: AuthenticateGoogleTask;

  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;
  @InjectDocument() linkDocument: LinkDocument;

  // Google Calendar tools
  @InjectTool() googleCalendarListCalendars: GoogleCalendarListCalendarsTool;
  @InjectTool() googleCalendarFetchEvents: GoogleCalendarFetchEventsTool;
  @InjectTool() googleCalendarCreateEvent: GoogleCalendarCreateEventTool;

  // Gmail tools
  @InjectTool() gmailSearchMessages: GmailSearchMessagesTool;
  @InjectTool() gmailGetMessage: GmailGetMessageTool;
  @InjectTool() gmailSendMessage: GmailSendMessageTool;
  @InjectTool() gmailReplyToMessage: GmailReplyToMessageTool;

  // Google Drive tools
  @InjectTool() googleDriveListFiles: GoogleDriveListFilesTool;
  @InjectTool() googleDriveGetFileMetadata: GoogleDriveGetFileMetadataTool;
  @InjectTool() googleDriveDownloadFile: GoogleDriveDownloadFileTool;
  @InjectTool() googleDriveUploadFile: GoogleDriveUploadFileTool;

  @InjectWorkflow() oAuth: OAuthWorkflow;

  @State({
    schema: z.object({
      llmResult: z.any().optional(),
      delegateResult: z.any().optional(),
    }),
  })
  state: {
    llmResult?: any;
    delegateResult?: any;
  };

  @Runtime()
  runtime: any;
}
