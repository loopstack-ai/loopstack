import { z } from 'zod';
import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  DelegateToolCalls,
  DelegateToolCallsResult,
  UpdateToolResult,
} from '@loopstack/claude-module';
import {
  BaseWorkflow,
  Guard,
  Initial,
  InjectTool,
  InjectWorkflow,
  ToolResult,
  Transition,
  Workflow,
} from '@loopstack/common';
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
  uiConfig: __dirname + '/google-workspace-agent.ui.yaml',
})
export class GoogleWorkspaceAgentWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;
  @InjectTool() authenticateGoogle: AuthenticateGoogleTask;

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

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.repository.save(
      ClaudeMessageDocument,
      {
        role: 'user',
        content: this.render(__dirname + '/templates/systemMessage.md'),
      },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(ClaudeMessageDocument, {
      role: 'user',
      content: payload,
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
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
    const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.call({
      message: this.llmResult!,
      callback: { transition: 'toolResultReceived' },
    });
    this.delegateResult = result.data;
  }

  hasToolCalls(): boolean {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(payload: Record<string, unknown>) {
    const result: ToolResult<DelegateToolCallsResult> = await this.updateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
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
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
