import { z } from 'zod';
import {
  Final,
  Guard,
  Initial,
  InjectDocument,
  InjectTemplates,
  InjectTool,
  InjectWorkflow,
  Input,
  ToolResult,
  Transition,
  Workflow,
  WorkflowMetadataInterface,
  WorkflowTemplates,
} from '@loopstack/common';
import { LinkDocument, MarkdownDocument, Task } from '@loopstack/core';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { GoogleCalendarFetchEventsTool } from '../tools';

interface TaskRunResult {
  mode: string;
  correlationId: string;
  workflowId: string;
  eventName: string;
}

interface SubWorkflowCallbackPayload {
  workflowId: string;
  status: string;
}

interface CalendarFetchResult {
  error?: string;
  events?: Array<{ id: string; summary: string; start?: string; end?: string }>;
}

@Workflow({
  uiConfig: __dirname + '/calendar-summary.workflow.yaml',
  templates: {
    calendarSummary: __dirname + '/templates/calendarSummary.md',
  },
})
export class CalendarSummaryWorkflow {
  // Core tools
  @InjectTool() private task: Task;

  // Custom tool (demonstrates building an OAuth-aware tool from scratch)
  @InjectTool() private googleCalendarFetchEvents: GoogleCalendarFetchEventsTool;

  // Documents
  @InjectDocument() private linkDocument: LinkDocument;
  @InjectDocument() private markdown: MarkdownDocument;

  @InjectWorkflow() private oAuth: OAuthWorkflow;
  @InjectTemplates() templates: WorkflowTemplates;

  @Input({
    schema: z
      .object({
        calendarId: z.string().default('primary'),
      })
      .strict(),
  })
  args: {
    calendarId: string;
  };

  private runtime: WorkflowMetadataInterface;

  events?: Array<{ id: string; summary: string; start?: string; end?: string }>;
  requiresAuthentication?: boolean;
  private authWorkflowId?: string;

  // --- Fetch events from Google Calendar ---

  @Initial({ to: 'calendar_fetched' })
  async fetchEvents() {
    const result: ToolResult<CalendarFetchResult> = await this.googleCalendarFetchEvents.run({
      calendarId: this.args.calendarId,
      timeMin: this.now(),
      timeMax: this.endOfWeek(),
    });
    this.requiresAuthentication = result.data!.error === 'unauthorized';
    this.events = result.data!.events;
  }

  // If unauthorized -> launch OAuth as sub-workflow
  @Transition({ from: 'calendar_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired() {
    const taskResult: ToolResult<TaskRunResult> = await this.task.run({
      workflow: 'oAuth',
      args: {
        provider: 'google',
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      },
      callback: { transition: 'authCompleted' },
    });
    this.authWorkflowId = taskResult.data!.workflowId;

    await this.linkDocument.create({
      id: 'authStatus',
      content: {
        icon: 'LockKeyhole',
        label: 'Google authentication required',
        caption: 'Complete sign-in to continue',
        href: `/workflows/${this.authWorkflowId}`,
        embed: true,
        expanded: true,
      },
    });
  }

  needsAuth(): boolean {
    return !!this.requiresAuthentication;
  }

  // Auth sub-workflow completed -> retry from start
  @Transition({ from: 'awaiting_auth', to: 'start', wait: true })
  async authCompleted() {
    await this.linkDocument.create({
      id: 'authStatus',
      content: {
        icon: 'ShieldCheck',
        type: 'success',
        label: 'Google authentication completed',
        caption: 'Google authentication required to access your calendar.',
        href: `/workflows/${(this.runtime.transition!.payload as SubWorkflowCallbackPayload).workflowId}`,
      },
    });
  }

  // Success -> display summary
  @Final({ from: 'calendar_fetched' })
  async displayResults() {
    await this.markdown.create({
      content: {
        markdown: this.templates.render('calendarSummary', { events: this.events }),
      },
    });
  }

  private now(): string {
    return new Date().toISOString();
  }

  private endOfWeek(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek.toISOString();
  }
}
