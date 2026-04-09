import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateDocument, ClaudeModule } from '@loopstack/claude-module';
import { RunContext, WorkflowEntity, getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { MeetingNotesDocument } from '../documents/meeting-notes-document';
import { OptimizedNotesDocument } from '../documents/optimized-notes-document';
import { MeetingNotesWorkflow } from '../meeting-notes.workflow';

describe('MeetingNotesWorkflow', () => {
  let module: TestingModule;
  let workflow: MeetingNotesWorkflow;
  let processor: WorkflowProcessorService;

  let mockClaudeGenerateDocument: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(MeetingNotesWorkflow)
      .withImports(LoopCoreModule, ClaudeModule)
      .withProvider(MeetingNotesDocument)
      .withProvider(OptimizedNotesDocument)
      .withToolOverride(ClaudeGenerateDocument)
      .compile();

    workflow = module.get(MeetingNotesWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockClaudeGenerateDocument = module.get(ClaudeGenerateDocument);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('claudeGenerateDocument');
    });
  });

  describe('initial step', () => {
    it('should execute initial step and stop at waiting_for_response', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('waiting_for_response');

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual(
        expect.objectContaining({
          className: 'MeetingNotesDocument',
          content: expect.objectContaining({
            text: expect.stringContaining('1.1.2025'),
          }),
        }),
      );
    });

    it('should use custom input text when provided', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, { inputText: 'Custom meeting notes here' }, context);

      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);

      expect(result.documents[0]).toEqual(
        expect.objectContaining({
          content: expect.objectContaining({
            text: expect.stringContaining('Custom meeting notes here'),
          }),
        }),
      );
    });
  });

  describe('resume from waiting_for_response', () => {
    it('should process user response and call LLM to optimize notes', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      mockClaudeGenerateDocument.call.mockResolvedValue({ data: undefined });

      const context = {
        workflowEntity: {
          id: workflowId,
          place: 'waiting_for_response',
          documents: [],
        } as Partial<WorkflowEntity>,
        payload: {
          transition: {
            id: 'userResponse',
            workflowId,
            payload: { text: 'Cleaned up meeting notes from user' },
          },
        },
      } as unknown as RunContext;

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('notes_optimized');

      // User response should have been saved as document
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'MeetingNotesDocument',
          }),
        ]),
      );

      // LLM should have been called to optimize notes
      expect(mockClaudeGenerateDocument.call).toHaveBeenCalledTimes(1);
      expect(mockClaudeGenerateDocument.call).toHaveBeenCalledWith(
        expect.objectContaining({
          claude: { model: 'claude-sonnet-4-6' },
          response: expect.objectContaining({ id: 'final' }),
          prompt: expect.stringContaining('meeting notes'),
        }),
        undefined,
      );
    });
  });

  describe('resume from notes_optimized', () => {
    it('should complete workflow when user confirms optimized notes', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000002';

      const optimizedPayload = {
        date: '2025-01-01',
        summary: 'Budget discussion with updates',
        participants: ['Sarah', 'Anna', 'Bob'],
        decisions: ['Cut costs by 15%'],
        actionItems: ['Follow up on vendor pricing by Friday'],
      };

      const context = {
        workflowEntity: {
          id: workflowId,
          place: 'notes_optimized',
          documents: [],
        } as Partial<WorkflowEntity>,
        payload: {
          transition: {
            id: 'confirm',
            workflowId,
            payload: optimizedPayload,
          },
        },
      } as unknown as RunContext;

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(false);
      expect(result.place).toBe('end');

      // Confirmed payload should have been saved as OptimizedNotesDocument
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'OptimizedNotesDocument',
          }),
        ]),
      );

      // No additional LLM calls during confirmation
      expect(mockClaudeGenerateDocument.call).not.toHaveBeenCalled();
    });
  });
});
