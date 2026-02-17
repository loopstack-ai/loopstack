import { TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import {
  RunContext,
  generateObjectFingerprint,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockDocuments,
  getBlockHelper,
  getBlockHelpers,
  getBlockStateSchema,
  getBlockTools,
} from '@loopstack/common';
import { ExecuteWorkflowAsync, WorkflowProcessorService } from '@loopstack/core';
import { CoreUiModule, CreateDocument } from '@loopstack/core-ui-module';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { GoogleCalendarFetchEventsTool } from '../../tools';
import { CalendarSummaryWorkflow } from '../calendar-summary.workflow';

describe('CalendarSummaryWorkflow', () => {
  let module: TestingModule;
  let workflow: CalendarSummaryWorkflow;
  let processor: WorkflowProcessorService;

  let mockGoogleCalendarFetchEventsTool: ToolMock;
  let mockExecuteWorkflowAsyncTool: ToolMock;
  let mockCreateDocumentTool: ToolMock;
  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(CalendarSummaryWorkflow)
      .withImports(CoreUiModule, CreateChatMessageToolModule)
      .withToolMock(GoogleCalendarFetchEventsTool)
      .withToolOverride(ExecuteWorkflowAsync)
      .withToolOverride(CreateDocument)
      .withToolOverride(CreateChatMessage)
      .compile();

    workflow = module.get(CalendarSummaryWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockGoogleCalendarFetchEventsTool = module.get(GoogleCalendarFetchEventsTool);
    mockExecuteWorkflowAsyncTool = module.get(ExecuteWorkflowAsync);
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

    it('should have all tools available via workflow.tools', () => {
      expect(getBlockTools(workflow)).toBeDefined();
      expect(Array.isArray(getBlockTools(workflow))).toBe(true);
      expect(getBlockTools(workflow)).toContain('googleCalendarFetchEvents');
      expect(getBlockTools(workflow)).toContain('executeWorkflowAsync');
      expect(getBlockTools(workflow)).toContain('createDocument');
      expect(getBlockTools(workflow)).toContain('createChatMessage');
      expect(getBlockTools(workflow)).toHaveLength(4);
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

  describe('helpers', () => {
    it('should have helpers defined', () => {
      expect(getBlockHelpers(workflow)).toBeDefined();
      expect(Array.isArray(getBlockHelpers(workflow))).toBe(true);
    });

    it('should have now helper registered', () => {
      expect(getBlockHelpers(workflow)).toContain('now');
    });

    it('should have endOfWeek helper registered', () => {
      expect(getBlockHelpers(workflow)).toContain('endOfWeek');
    });

    it('should execute now helper and return an ISO date string', () => {
      const nowHelper = getBlockHelper(workflow, 'now')!;
      expect(nowHelper).toBeDefined();
      const result = nowHelper.call(workflow);
      expect(typeof result).toBe('string');
      expect(() => new Date(result).toISOString()).not.toThrow();
    });

    it('should execute endOfWeek helper and return a date after now', () => {
      const endOfWeekHelper = getBlockHelper(workflow, 'endOfWeek')!;
      expect(endOfWeekHelper).toBeDefined();
      const result = endOfWeekHelper.call(workflow);
      expect(typeof result).toBe('string');
      const endDate = new Date(result);
      expect(endDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return undefined for non-existent helper', () => {
      const nonExistent = getBlockHelper(workflow, 'nonExistentHelper');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('workflow execution', () => {
    it('should execute fetch_events and display_results when events are returned', async () => {
      const context = {} as RunContext;

      mockGoogleCalendarFetchEventsTool.execute.mockResolvedValue({
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

      expect(mockGoogleCalendarFetchEventsTool.execute).toHaveBeenCalledTimes(1);
      expect(mockCreateDocumentTool.execute).toHaveBeenCalledTimes(1);
    });

    it('should execute fetch_events and auth_required when unauthorized', async () => {
      const context = {} as RunContext;

      mockGoogleCalendarFetchEventsTool.execute.mockResolvedValue({
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      });

      mockExecuteWorkflowAsyncTool.execute.mockResolvedValue({
        data: {
          task: {
            pipelineId: 'test-pipeline-id',
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('awaiting_auth');

      expect(mockGoogleCalendarFetchEventsTool.execute).toHaveBeenCalledTimes(1);
      expect(mockExecuteWorkflowAsyncTool.execute).toHaveBeenCalledTimes(1);
      expect(mockExecuteWorkflowAsyncTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: 'oauth',
          args: expect.objectContaining({
            provider: 'google',
            scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
          }),
          callback: { transition: 'auth_completed' },
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(mockCreateDocumentTool.execute).toHaveBeenCalledTimes(1);
    });

    it('should pass calendarId argument to fetch events tool', async () => {
      const context = {} as RunContext;

      mockGoogleCalendarFetchEventsTool.execute.mockResolvedValue({
        data: { events: [] },
      });

      await processor.process(workflow, { calendarId: 'work@group.calendar.google.com' }, context);

      expect(mockGoogleCalendarFetchEventsTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'work@group.calendar.google.com',
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
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

    module = await createWorkflowTest()
      .forWorkflow(CalendarSummaryWorkflow)
      .withImports(CoreUiModule, CreateChatMessageToolModule)
      .withToolMock(GoogleCalendarFetchEventsTool)
      .withToolOverride(ExecuteWorkflowAsync)
      .withToolOverride(CreateDocument)
      .withToolOverride(CreateChatMessage)
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
    mockGoogleCalendarFetchEvents.execute.mockResolvedValue({
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
          payload: { pipelineId: 'auth-pipeline-id' },
        },
      },
    } as unknown as RunContext;

    const result = await processor.process(workflow, args, context);

    expect(result).toBeDefined();
    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    // auth_completed calls createDocument, then fetch_events runs, then display_results calls createDocument
    expect(mockCreateDocument.execute).toHaveBeenCalled();
    expect(mockGoogleCalendarFetchEvents.execute).toHaveBeenCalledTimes(1);
  });

  it('should resume from existing workflow state', async () => {
    module = await createWorkflowTest()
      .forWorkflow(CalendarSummaryWorkflow)
      .withImports(CoreUiModule, CreateChatMessageToolModule)
      .withToolMock(GoogleCalendarFetchEventsTool)
      .withToolOverride(ExecuteWorkflowAsync)
      .withToolOverride(CreateDocument)
      .withToolOverride(CreateChatMessage)
      .withExistingWorkflow({
        place: 'calendar_fetched',
        inputData: { calendarId: 'primary' },
      })
      .compile();

    const workflow = module.get(CalendarSummaryWorkflow);
    expect(workflow).toBeDefined();
  });
});
