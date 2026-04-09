import { TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import { RunContext, WorkflowEntity, getBlockArgsSchema, getBlockConfig, getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import {
  GmailGetMessageTool,
  GmailReplyToMessageTool,
  GmailSearchMessagesTool,
  GmailSendMessageTool,
  GoogleCalendarCreateEventTool,
  GoogleCalendarFetchEventsTool as GoogleCalendarFetchEventsModuleTool,
  GoogleCalendarListCalendarsTool,
  GoogleDriveDownloadFileTool,
  GoogleDriveGetFileMetadataTool,
  GoogleDriveListFilesTool,
  GoogleDriveUploadFileTool,
} from '@loopstack/google-workspace-module';
import { OAuthModule, OAuthWorkflow } from '@loopstack/oauth-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { GoogleCalendarFetchEventsTool } from '../../tools';
import { CalendarSummaryWorkflow } from '../calendar-summary.workflow';

const mockOAuthWorkflow = {
  run: jest.fn(),
};

function buildCalendarSummaryTest() {
  return createWorkflowTest()
    .forWorkflow(CalendarSummaryWorkflow)
    .withImports(LoopCoreModule, CreateChatMessageToolModule, OAuthModule)
    .withToolMock(GoogleCalendarFetchEventsTool)
    .withToolMock(GoogleCalendarListCalendarsTool)
    .withToolMock(GoogleCalendarFetchEventsModuleTool)
    .withToolMock(GoogleCalendarCreateEventTool)
    .withToolMock(GmailSearchMessagesTool)
    .withToolMock(GmailGetMessageTool)
    .withToolMock(GmailSendMessageTool)
    .withToolMock(GmailReplyToMessageTool)
    .withToolMock(GoogleDriveListFilesTool)
    .withToolMock(GoogleDriveGetFileMetadataTool)
    .withToolMock(GoogleDriveDownloadFileTool)
    .withToolMock(GoogleDriveUploadFileTool)
    .withMock(OAuthWorkflow, mockOAuthWorkflow)
    .withToolOverride(CreateChatMessage);
}

describe('CalendarSummaryWorkflow', () => {
  let module: TestingModule;
  let workflow: CalendarSummaryWorkflow;
  let processor: WorkflowProcessorService;

  let mockGoogleCalendarFetchEventsTool: ToolMock;

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await buildCalendarSummaryTest().compile();

    workflow = module.get(CalendarSummaryWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockGoogleCalendarFetchEventsTool = module.get(GoogleCalendarFetchEventsTool);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
    });

    it('should have argsSchema defined', () => {
      expect(getBlockArgsSchema(workflow)).toBeDefined();
      expect(getBlockArgsSchema(workflow)).toBeInstanceOf(z.ZodType);
    });

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });

    it('should have custom tool available', () => {
      const tools = getBlockTools(workflow);
      expect(tools).toBeDefined();
      expect(tools).toContain('googleCalendarFetchEvents');
    });
  });

  describe('arguments', () => {
    it('should validate arguments with correct schema', () => {
      const schema = getBlockArgsSchema(workflow)!;
      const result = schema.parse({ calendarId: 'my-calendar' });
      expect(result).toEqual({ calendarId: 'my-calendar' });
    });

    it('should apply default calendarId when arguments are missing', () => {
      const schema = getBlockArgsSchema(workflow)!;
      const result = schema.parse({});
      expect(result).toEqual({ calendarId: 'primary' });
    });

    it('should reject extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(workflow)!;
      expect(() => schema.parse({ calendarId: 'primary', extra: 'not-allowed' })).toThrow();
    });
  });

  describe('workflow execution', () => {
    it('should execute fetch_events and display_results when events are returned', async () => {
      const context = createStatelessContext();

      mockGoogleCalendarFetchEventsTool.call.mockResolvedValue({
        data: {
          events: [
            { id: 'e1', summary: 'Team Standup', start: '2025-01-02T09:00:00Z', end: '2025-01-02T09:30:00Z' },
            { id: 'e2', summary: 'Lunch', start: '2025-01-02T12:00:00Z', end: '2025-01-02T13:00:00Z' },
          ],
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');

      expect(mockGoogleCalendarFetchEventsTool.call).toHaveBeenCalledTimes(1);

      // Verify markdown summary document was created
      expect(result.documents).toEqual(
        expect.arrayContaining([expect.objectContaining({ className: 'MarkdownDocument' })]),
      );
    });

    it('should execute fetch_events and auth_required when unauthorized', async () => {
      const context = createStatelessContext();

      mockGoogleCalendarFetchEventsTool.call.mockResolvedValue({
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      });

      mockOAuthWorkflow.run.mockResolvedValue({
        workflowId: 'test-workflow-id',
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('awaiting_auth');

      expect(mockGoogleCalendarFetchEventsTool.call).toHaveBeenCalledTimes(1);
      expect(mockOAuthWorkflow.run).toHaveBeenCalledTimes(1);
      expect(mockOAuthWorkflow.run).toHaveBeenCalledWith(
        { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
        expect.objectContaining({
          alias: 'oAuth',
          callback: { transition: 'authCompleted' },
        }),
      );

      // Link document should have been created for auth flow
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'LinkDocument',
            content: expect.objectContaining({
              label: 'Google authentication required',
            }),
          }),
        ]),
      );
    });

    it('should pass calendarId argument to fetch events tool', async () => {
      const context = createStatelessContext();

      mockGoogleCalendarFetchEventsTool.call.mockResolvedValue({
        data: { events: [] },
      });

      await processor.process(workflow, { calendarId: 'work@group.calendar.google.com' }, context);

      expect(mockGoogleCalendarFetchEventsTool.call).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'work@group.calendar.google.com',
        }),
      );
    });
  });
});

describe('CalendarSummaryWorkflow with existing entity', () => {
  let module: TestingModule;

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should resume from awaiting_auth and retry fetching events after auth_completed', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const args = { calendarId: 'primary' };

    jest.clearAllMocks();

    module = await buildCalendarSummaryTest().compile();

    const workflow = module.get(CalendarSummaryWorkflow);
    const processor = module.get(WorkflowProcessorService);
    const mockGoogleCalendarFetchEvents: ToolMock = module.get(GoogleCalendarFetchEventsTool);

    // After auth, the workflow goes back to start and fetches events again
    mockGoogleCalendarFetchEvents.call.mockResolvedValue({
      data: {
        events: [
          { id: 'e1', summary: 'Post-Auth Meeting', start: '2025-01-03T14:00:00Z', end: '2025-01-03T15:00:00Z' },
        ],
      },
    });

    const context = {
      workflowEntity: {
        id: workflowId,
        place: 'awaiting_auth',
        documents: [],
      } as Partial<WorkflowEntity>,
      payload: {
        transition: {
          id: 'authCompleted',
          workflowId,
          payload: { workflowId: 'auth-workflow-id', status: 'completed', data: {} },
        },
      },
    } as unknown as RunContext;

    const result = await processor.process(workflow, args, context);

    expect(result).toBeDefined();
    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    expect(mockGoogleCalendarFetchEvents.call).toHaveBeenCalledTimes(1);

    // Verify markdown summary was created after auth resume
    expect(result.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ className: 'MarkdownDocument' })]),
    );
  });
});
