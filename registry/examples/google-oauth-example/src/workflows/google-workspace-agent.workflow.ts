import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, Guard, TEMPLATE_RENDERER, Transition, Workflow } from '@loopstack/common';
import type { TemplateRenderFn } from '@loopstack/common';
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
import { AuthenticateGoogleTask } from '../tools/authenticate-google-task.tool';

interface GoogleWorkspaceAgentState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  title: 'Google Workspace Agent',
  description:
    'An interactive chat agent with access to Google Calendar, Gmail, and Google Drive.\nAsk it to check your calendar, search emails, find files, send messages, create events, and more.\nHandles OAuth authentication automatically when needed — the agent detects unauthorized errors\nand launches authentication on its own.',
  name: 'google_workspace_agent',
  widget: __dirname + '/google-workspace-agent.ui.yaml',
})
export class GoogleWorkspaceAgentWorkflow extends BaseWorkflow<Record<string, unknown>, GoogleWorkspaceAgentState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    private readonly authenticateGoogle: AuthenticateGoogleTask,
    // Google Calendar tools
    private readonly googleCalendarListCalendars: GoogleCalendarListCalendarsTool,
    private readonly googleCalendarFetchEvents: GoogleCalendarFetchEventsTool,
    private readonly googleCalendarCreateEvent: GoogleCalendarCreateEventTool,
    // Gmail tools
    private readonly gmailSearchMessages: GmailSearchMessagesTool,
    private readonly gmailGetMessage: GmailGetMessageTool,
    private readonly gmailSendMessage: GmailSendMessageTool,
    private readonly gmailReplyToMessage: GmailReplyToMessageTool,
    // Google Drive tools
    private readonly googleDriveListFiles: GoogleDriveListFilesTool,
    private readonly googleDriveGetFileMetadata: GoogleDriveGetFileMetadataTool,
    private readonly googleDriveDownloadFile: GoogleDriveDownloadFileTool,
    private readonly googleDriveUploadFile: GoogleDriveUploadFileTool,
    private readonly oAuth: OAuthWorkflow,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async setup(state: GoogleWorkspaceAgentState): Promise<GoogleWorkspaceAgentState> {
    await this.documentStore.save(
      LlmMessageDocument,
      {
        role: 'user',
        content: this.render(__dirname + '/templates/systemMessage.md'),
      },
      { meta: { hidden: true } },
    );
    return state;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: GoogleWorkspaceAgentState, payload: string): Promise<GoogleWorkspaceAgentState> {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      content: payload,
    });
    return state;
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: GoogleWorkspaceAgentState): Promise<GoogleWorkspaceAgentState> {
    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          model: 'claude-sonnet-4-6',
          system: `You are a helpful Google Workspace assistant with access to Calendar, Gmail, and Drive tools.
When a tool returns an unauthorized error, use authenticateGoogle to let the user sign in,
then retry. Be concise and format results using markdown.`,
          tools: [
            'google_calendar_list_calendars',
            'google_calendar_fetch_events',
            'google_calendar_create_event',
            'gmail_search_messages',
            'gmail_get_message',
            'gmail_send_message',
            'gmail_reply_to_message',
            'google_drive_list_files',
            'google_drive_get_file_metadata',
            'google_drive_download_file',
            'google_drive_upload_file',
            'authenticate_google',
          ],
        },
      },
    );
    return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: GoogleWorkspaceAgentState): Promise<GoogleWorkspaceAgentState> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    const result = await this.llmDelegateToolCalls.call(
      {
        message: state.llmResult!.message,
        callback: { transition: 'toolResultReceived' },
      },
      { config: { provider: 'claude' } },
    );
    return { ...state, delegateResult: result.data };
  }

  hasToolCalls(state: GoogleWorkspaceAgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(
    state: GoogleWorkspaceAgentState,
    payload: Record<string, unknown>,
  ): Promise<GoogleWorkspaceAgentState> {
    const result = await this.llmUpdateToolResult.call(
      {
        delegateResult: state.delegateResult!,
        completedTool: payload,
      },
      { config: { provider: 'claude' } },
    );
    return { ...state, delegateResult: result.data };
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async allToolsCompleteTransition(state: GoogleWorkspaceAgentState): Promise<GoogleWorkspaceAgentState> {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      content: state.delegateResult!.toolResults.map((tr) => ({
        type: 'tool_result' as const,
        toolCallId: tr.toolCallId,
        content: tr.content ?? '',
        isError: tr.isError ?? false,
      })),
    });
    return state;
  }

  allToolsComplete(state: GoogleWorkspaceAgentState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond(state: GoogleWorkspaceAgentState): Promise<GoogleWorkspaceAgentState> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return state;
  }
}
