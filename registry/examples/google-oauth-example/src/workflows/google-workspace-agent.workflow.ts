import { z } from 'zod';
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
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { AuthenticateGoogleTask } from '../tools/authenticate-google-task.tool.js';

@Workflow({
  uiConfig: import.meta.dirname + '/google-workspace-agent.ui.yaml',
})
export class GoogleWorkspaceAgentWorkflow extends BaseWorkflow {
  @InjectTool({
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    system: `You are a helpful Google Workspace assistant with access to Calendar, Gmail, and Drive tools.
When a tool returns an unauthorized error, use authenticateGoogle to let the user sign in,
then retry. Be concise and format results using markdown.`,
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
  })
  llmGenerateText: LlmGenerateTextTool;
  @InjectTool({ provider: 'claude' }) llmDelegateToolCalls: LlmDelegateToolCallsTool;
  @InjectTool({ provider: 'claude' }) llmUpdateToolResult: LlmUpdateToolResultTool;
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

  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.repository.save(
      LlmMessageDocument,
      {
        role: 'user',
        content: this.render(import.meta.dirname + '/templates/systemMessage.md'),
      },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(LlmMessageDocument, {
      role: 'user',
      content: payload,
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result: ToolResult<LlmGenerateTextResult, LlmResultMeta> = await this.llmGenerateText.call();
    this.llmResult = result.data;
    this.llmMeta = result.metadata;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: { response: this.llmResult!.response, provider: this.llmMeta!.provider },
    });
    const result: ToolResult<LlmDelegateResult> = await this.llmDelegateToolCalls.call({
      message: this.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.delegateResult = result.data;
  }

  hasToolCalls(): boolean {
    return this.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(payload: Record<string, unknown>) {
    const result: ToolResult<LlmDelegateResult> = await this.llmUpdateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
    });
    this.delegateResult = result.data;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async allToolsCompleteTransition() {
    await this.repository.save(LlmMessageDocument, {
      role: 'user',
      content: this.delegateResult!.toolResults.map((tr) => ({
        type: 'tool_result' as const,
        toolCallId: tr.toolCallId,
        content: tr.content ?? '',
        isError: tr.isError ?? false,
      })),
    });
  }

  allToolsComplete(): boolean {
    return this.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond() {
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: { response: this.llmResult!.response, provider: this.llmMeta!.provider },
    });
  }
}
