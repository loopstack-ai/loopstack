import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { TransitionInput } from '@loopstack/common';
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
import type { LlmDelegateResult, LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import {
  LlmContextDocument,
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { AuthenticateGoogleTask } from '../../shared/google/authenticate-google-task.tool';

interface GoogleWorkspaceAgentState {
  llmResult?: LlmGenerateTextResult;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  title: 'OAuth - Google Workspace Agent Example',
  description:
    'An interactive chat agent with access to Google Calendar, Gmail, and Google Drive. Handles OAuth automatically — the agent detects unauthorized errors and launches authentication on its own.',
  name: 'google_workspace_agent_example',
  widget: './google-workspace-agent-example.ui.yaml',
})
export class GoogleWorkspaceAgentExampleWorkflow extends BaseWorkflow {
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
  ) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async setup() {
    await this.documentStore.save(LlmContextDocument, {
      role: 'user',
      text: this.render(join(__dirname, 'templates', 'systemMessage.md')),
    });
    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: this.render(join(__dirname, 'templates', 'welcomeMessage.md')),
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(_state: GoogleWorkspaceAgentState, input: TransitionInput<string>) {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: input.data });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
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
    this.assignState({ llmResult: result.data });
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: GoogleWorkspaceAgentState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.assignState({ delegateResult: result.data });
  }

  hasToolCalls(state: GoogleWorkspaceAgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(state: GoogleWorkspaceAgentState, input: TransitionInput<Record<string, unknown>>) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: input,
    });
    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  allToolsCompleteTransition() {}

  allToolsComplete(state: GoogleWorkspaceAgentState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  respond() {}
}
