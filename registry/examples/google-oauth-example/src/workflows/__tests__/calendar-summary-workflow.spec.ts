import { TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import {
  RunContext,
  generateObjectFingerprint,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockDocuments,
  getBlockStateSchema,
  getBlockTools,
} from '@loopstack/common';
import { CreateDocument, LoopCoreModule, Task, WorkflowProcessorService } from '@loopstack/core';
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
import { OAuthModule } from '@loopstack/oauth-module';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { GoogleCalendarFetchEventsTool } from '../../tools';
import { CalendarSummaryWorkflow } from '../calendar-summary.workflow';

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
    .withToolOverride(Task)
    .withToolOverride(CreateDocument)
    .withToolOverride(CreateChatMessage);
}

describe('CalendarSummaryWorkflow', () => {
  let module: TestingModule;
  let workflow: CalendarSummaryWorkflow;
  let processor: WorkflowProcessorService;

  let mockGoogleCalendarFetchEventsTool: ToolMock;
  let mockTaskTool: ToolMock;
  let mockCreateDocumentTool: ToolMock;
  beforeEach(async () => {
    module = await buildCalendarSummaryTest().compile();

    workflow = module.get(CalendarSummaryWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockGoogleCalendarFetchEventsTool = module.get(GoogleCalendarFetchEventsTool);
    mockTaskTool = module.get(Task);
    mockCreateDocumentTool = module.get(CreateDocument);
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

    it('should have stateSchema defined', () => {
      expect(getBlockStateSchema(workflow)).toBeDefined();
      expect(getBlockStateSchema(workflow)).toBeInstanceOf(z.ZodType);
    });

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });

    it('should have all 15 tools available', () => {
      const tools = getBlockTools(workflow);
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);

      // Core tools
      expect(tools).toContain('task');
      expect(tools).toContain('createDocument');
      expect(tools).toContain('createChatMessage');

      // Custom tool
      expect(tools).toContain('googleCalendarFetchEvents');

      // Google Calendar tools (from module)
      expect(tools).toContain('googleCalendarListCalendars');
      expect(tools).toContain('googleCalendarFetchEventsModule');
      expect(tools).toContain('googleCalendarCreateEvent');

      // Gmail tools
      expect(tools).toContain('gmailSearchMessages');
      expect(tools).toContain('gmailGetMessage');
      expect(tools).toContain('gmailSendMessage');
      expect(tools).toContain('gmailReplyToMessage');

      // Google Drive tools
      expect(tools).toContain('googleDriveListFiles');
      expect(tools).toContain('googleDriveGetFileMetadata');
      expect(tools).toContain('googleDriveDownloadFile');
      expect(tools).toContain('googleDriveUploadFile');

      expect(tools).toHaveLength(15);
    });

    it('should have all documents available', () => {
      expect(getBlockDocuments(workflow)).toBeDefined();
      expect(Array.isArray(getBlockDocuments(workflow))).toBe(true);
      expect(getBlockDocuments(workflow)).toContain('linkDocument');
      expect(getBlockDocuments(workflow)).toContain('markdown');
      expect(getBlockDocuments(workflow)).toHaveLength(2);
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

  describe('states', () => {
    it('should have stateSchema with expected properties', () => {
      const schema = getBlockStateSchema(workflow) as z.ZodObject<any>;
      expect(schema).toBeDefined();

      const shape = schema.shape;
      expect(shape.events).toBeDefined();
      expect(shape.requiresAuthentication).toBeDefined();
    });

    it('should validate state with all optional fields', () => {
      const schema = getBlockStateSchema(workflow)!;
      const result = schema.parse({});
      expect(result).toEqual({});
    });

    it('should validate state with populated fields', () => {
      const schema = getBlockStateSchema(workflow)!;
      const state = {
        events: [{ id: 'e1', summary: 'Meeting', start: '2025-01-01T10:00:00Z', end: '2025-01-01T11:00:00Z' }],
        requiresAuthentication: false,
      };
      const result = schema.parse(state);
      expect(result).toEqual(state);
    });

    it('should throw error for invalid state field types', () => {
      const schema = getBlockStateSchema(workflow)!;
      expect(() => schema.parse({ events: 'not-an-array' })).toThrow();
      expect(() => schema.parse({ requiresAuthentication: 'not-a-boolean' })).toThrow();
    });
  });

  describe('workflow execution', () => {
    it('should execute fetch_events and display_results when events are returned', async () => {
      const context = {} as RunContext;

      mockGoogleCalendarFetchEventsTool.run.mockResolvedValue({
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

      expect(mockGoogleCalendarFetchEventsTool.run).toHaveBeenCalledTimes(1);
      expect(mockCreateDocumentTool.run).toHaveBeenCalledTimes(1);
    });

    it('should execute fetch_events and auth_required when unauthorized', async () => {
      const context = {} as RunContext;

      mockGoogleCalendarFetchEventsTool.run.mockResolvedValue({
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      });

      mockTaskTool.run.mockResolvedValue({
        data: {
          workflowId: 'test-workflow-id',
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('awaiting_auth');

      expect(mockGoogleCalendarFetchEventsTool.run).toHaveBeenCalledTimes(1);
      expect(mockTaskTool.run).toHaveBeenCalledTimes(1);
      expect(mockTaskTool.run).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: 'oAuth',
          args: expect.objectContaining({
            provider: 'google',
            scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
          }),
          callback: { transition: 'auth_completed' },
        }),
      );
      expect(mockCreateDocumentTool.run).toHaveBeenCalledTimes(1);
    });

    it('should pass calendarId argument to fetch events tool', async () => {
      const context = {} as RunContext;

      mockGoogleCalendarFetchEventsTool.run.mockResolvedValue({
        data: { events: [] },
      });

      await processor.process(workflow, { calendarId: 'work@group.calendar.google.com' }, context);

      expect(mockGoogleCalendarFetchEventsTool.run).toHaveBeenCalledWith(
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

    module = await buildCalendarSummaryTest()
      .withExistingWorkflow({
        place: 'awaiting_auth',
        inputData: args,
        id: workflowId,
        hashRecord: {
          options: generateObjectFingerprint(args),
        },
      })
      .compile();

    const workflow = module.get(CalendarSummaryWorkflow);
    const processor = module.get(WorkflowProcessorService);
    const mockGoogleCalendarFetchEvents: ToolMock = module.get(GoogleCalendarFetchEventsTool);
    const mockCreateDocument: ToolMock = module.get(CreateDocument);

    // After auth, the workflow goes back to start and fetches events again
    mockGoogleCalendarFetchEvents.run.mockResolvedValue({
      data: {
        events: [
          { id: 'e1', summary: 'Post-Auth Meeting', start: '2025-01-03T14:00:00Z', end: '2025-01-03T15:00:00Z' },
        ],
      },
    });

    const context = {
      payload: {
        transition: {
          id: 'auth_completed',
          workflowId,
          payload: { workflowId: 'auth-workflow-id' },
        },
      },
    } as unknown as RunContext;

    const result = await processor.process(workflow, args, context);

    expect(result).toBeDefined();
    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    // auth_completed calls createDocument, then fetch_events runs, then display_results calls createDocument
    expect(mockCreateDocument.run).toHaveBeenCalled();
    expect(mockGoogleCalendarFetchEvents.run).toHaveBeenCalledTimes(1);
  });

  it('should resume from existing workflow state', async () => {
    module = await buildCalendarSummaryTest()
      .withExistingWorkflow({
        place: 'calendar_fetched',
        inputData: { calendarId: 'primary' },
      })
      .compile();

    const workflow = module.get(CalendarSummaryWorkflow);
    expect(workflow).toBeDefined();
  });
});
