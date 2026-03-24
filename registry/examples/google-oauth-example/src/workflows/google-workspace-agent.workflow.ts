import { z } from 'zod';
import {
  AiGenerateText,
  AiMessageDocument,
  AiMessageDocumentContentType,
  DelegateToolCall,
} from '@loopstack/ai-module';
import {
  DefineHelper,
  InjectDocument,
  InjectTool,
  Runtime,
  State,
  ToolResult,
  Workflow,
  WorkflowInterface,
} from '@loopstack/common';
import { TransitionPayload } from '@loopstack/contracts/schemas';
import { ExecuteWorkflowAsync } from '@loopstack/core';
import { CreateDocument, LinkDocument } from '@loopstack/core-ui-module';
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

@Workflow({
  configFile: __dirname + '/google-workspace-agent.workflow.yaml',
})
export class GoogleWorkspaceAgentWorkflow implements WorkflowInterface {
  // AI tools
  @InjectTool() aiGenerateText: AiGenerateText;
  @InjectTool() delegateToolCall: DelegateToolCall;
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() executeWorkflowAsync: ExecuteWorkflowAsync;

  // Documents
  @InjectDocument() aiMessageDocument: AiMessageDocument;
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

  @State({
    schema: z
      .object({
        requiresAuthentication: z.boolean().optional(),
      })
      .strict(),
  })
  state: {
    requiresAuthentication?: boolean;
  };

  @DefineHelper()
  isToolCall(message: { parts?: { type: string }[] } | null | undefined): boolean {
    return message?.parts?.some((part) => part.type.startsWith('tool-')) ?? false;
  }

  @DefineHelper()
  checkAuthError(message: { parts?: { type: string; output?: { value?: string } }[] } | null | undefined): boolean {
    return (
      message?.parts?.some((part) => {
        if (!part.output?.value) return false;
        try {
          const parsed = JSON.parse(part.output.value) as { error?: string };
          return parsed.error === 'unauthorized' || parsed.error === '401';
        } catch {
          return false;
        }
      }) ?? false
    );
  }

  @Runtime()
  runtime: {
    tools: {
      llm_turn: { llm_call: ToolResult<AiMessageDocumentContentType> };
      execute_tool_calls: { delegate: ToolResult<AiMessageDocumentContentType> };
    };
    transition: TransitionPayload;
  };
}
