import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  DelegateToolCalls,
  DelegateToolCallsResult,
  UpdateToolResult,
} from '@loopstack/claude-module';
import {
  Guard,
  Initial,
  InjectDocument,
  InjectTemplates,
  InjectTool,
  InjectWorkflow,
  ToolResult,
  Transition,
  Workflow,
  WorkflowMetadataInterface,
  WorkflowTemplates,
} from '@loopstack/common';
import { LinkDocument, Task } from '@loopstack/core';
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

@Workflow({
  uiConfig: __dirname + '/google-workspace-agent.workflow.yaml',
  templates: {
    systemMessage: __dirname + '/templates/systemMessage.md',
  },
})
export class GoogleWorkspaceAgentWorkflow {
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
  @InjectTemplates() templates: WorkflowTemplates;

  private runtime: WorkflowMetadataInterface;

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.claudeMessageDocument.create({
      meta: { hidden: true },
      content: {
        role: 'user',
        content: this.templates.render('systemMessage'),
      },
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true })
  async userMessage() {
    await this.claudeMessageDocument.create({
      content: {
        role: 'user',
        content: this.runtime.transition!.payload as string,
      },
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.run({
      system: `You are a helpful Google Workspace assistant with access to Calendar, Gmail, and Drive tools.
When a tool returns an unauthorized error, use authenticateGoogle to let the user sign in,
then retry. Be concise and format results using markdown.`,
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
      tools: [
        'googleCalendarListCalendars',
        'googleCalendarFetchEvents',
        'googleCalendarCreateEvent',
        'gmailSearchMessages',
        'gmailGetMessage',
        'gmailSendMessage',
        'gmailReplyToMessage',
        'googleDriveListFiles',
        'googleDriveGetFileMetadata',
        'googleDriveDownloadFile',
        'googleDriveUploadFile',
        'authenticateGoogle',
      ],
    });
    this.llmResult = result.data;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.run({
      message: this.llmResult!,
      document: 'claudeMessageDocument',
      callback: { transition: 'toolResultReceived' },
    });
    this.delegateResult = result.data;
  }

  hasToolCalls(): boolean {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived() {
    const result: ToolResult<DelegateToolCallsResult> = await this.updateToolResult.run({
      delegateResult: this.delegateResult!,
      completedTool: this.runtime.transition!.payload as Record<string, unknown>,
      document: 'claudeMessageDocument',
    });
    this.delegateResult = result.data;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  allToolsCompleteTransition() {}

  allToolsComplete(): boolean {
    return this.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond() {
    await this.claudeMessageDocument.create({
      id: this.llmResult!.id,
      content: this.llmResult!,
    });
  }
}
