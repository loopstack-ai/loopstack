import { join } from 'node:path';
import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

/** The tools the agent is offered, by their `@Tool({ name })` — `authenticate_google` launches the sign-in. */
const TOOLS = [
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
];

const GoogleWorkspaceAgentExampleArgsSchema = z.object({
  initialMessage: z
    .string()
    .optional()
    .default('List my calendars, then summarize the events in my primary calendar for the next seven days.')
    .describe('Initial message shown to the agent.'),
});

type GoogleWorkspaceAgentExampleArgs = z.infer<typeof GoogleWorkspaceAgentExampleArgsSchema>;

@Workflow({
  title: 'Google Workspace - Agent Example',
  description:
    'Chat agent with 11 Google Calendar, Gmail, and Google Drive tools. When a tool returns unauthorized, the agent calls authenticate_google to let the user sign in, then retries.',
  name: 'google_workspace_agent_example',
  schema: GoogleWorkspaceAgentExampleArgsSchema,
})
export class GoogleWorkspaceAgentExampleWorkflow extends BaseWorkflow<GoogleWorkspaceAgentExampleArgs> {
  constructor(private readonly chatAgentWorkflow: ChatAgentWorkflow) {
    super();
  }

  // Without `taskMode` the chat agent never ends on its own, so the parent names no `onSuccess` transition.
  @Transition({ to: 'chatting' })
  async startChat(_state: Record<string, unknown>, ctx: RunContext<GoogleWorkspaceAgentExampleArgs>) {
    await this.chatAgentWorkflow.run(
      {
        system: this.render(join(__dirname, 'templates', 'system.md')),
        tools: TOOLS,
        userMessage: ctx.args.initialMessage,
      },
      { show: 'inline', label: 'Google Workspace Agent Chat' },
    );
  }
}
