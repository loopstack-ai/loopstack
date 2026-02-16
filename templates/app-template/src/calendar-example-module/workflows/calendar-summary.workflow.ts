import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  Context,
  DefineHelper,
  InjectDocument,
  InjectTool,
  Input,
  Runtime,
  State,
  Workflow,
  WorkflowInterface,
} from '@loopstack/common';
import { CreateDocument, LinkDocument } from '@loopstack/core-ui-module';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { AuthRequiredDocument } from '../../google-oauth-module';
import { GoogleCalendarFetchEventsTool } from '../tools';

@Injectable()
@Workflow({
  configFile: __dirname + '/calendar-summary.workflow.yaml',
})
export class CalendarSummaryWorkflow implements WorkflowInterface {
  @InjectTool() private googleCalendarFetchEvents: GoogleCalendarFetchEventsTool;
  @InjectTool() private createDocument: CreateDocument;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectDocument() private authRequiredDocument: AuthRequiredDocument;
  @InjectDocument() private linkDocument: LinkDocument;

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

  @Context()
  context: any;

  @Runtime()
  runtime: any;

  @State({
    schema: z
      .object({
        events: z
          .array(
            z.object({
              id: z.string(),
              summary: z.string(),
              start: z.string().optional(),
              end: z.string().optional(),
            }),
          )
          .optional(),
        requiresAuthentication: z.boolean().optional(),
      })
      .strict(),
  })
  state: {
    events?: Array<{ id: string; summary: string; start?: string; end?: string }>;
  };

  @DefineHelper()
  now() {
    return new Date().toISOString();
  }

  @DefineHelper()
  endOfWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // If today is Sunday (0), go to next Sunday (7 days); otherwise go to the coming Sunday
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek.toISOString();
  }
}
