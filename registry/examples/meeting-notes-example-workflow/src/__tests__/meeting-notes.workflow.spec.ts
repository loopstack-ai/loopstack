import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeModule } from '@loopstack/claude-module';
import { RunContext, WorkflowEntity } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { LlmGenerateObjectTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { MeetingNotesDocument } from '../documents/meeting-notes-document';
import { OptimizedNotesDocument } from '../documents/optimized-notes-document';
import { MeetingNotesWorkflow } from '../meeting-notes.workflow';

describe('MeetingNotesWorkflow', () => {
  let module: TestingModule;
  let workflow: MeetingNotesWorkflow;
  let processor: WorkflowProcessorService;
  let mockLlmGenerateObject: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(MeetingNotesWorkflow)
      .withImports(LlmProviderModule.forRoot({}), ClaudeModule)
      .withProvider(MeetingNotesDocument)
      .withProvider(OptimizedNotesDocument)
      .withToolOverride(LlmGenerateObjectTool)
      .compile();

    workflow = module.get(MeetingNotesWorkflow);
    processor = module.get(WorkflowProcessorService);
    mockLlmGenerateObject = module.get(LlmGenerateObjectTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
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
          documentName: 'meeting_notes',
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

      mockLlmGenerateObject.call.mockResolvedValue({
        data: { data: {} },
      });

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

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'meeting_notes',
          }),
        ]),
      );

      expect(mockLlmGenerateObject.call).toHaveBeenCalledTimes(1);
      expect(mockLlmGenerateObject.call).toHaveBeenCalledWith(
        expect.objectContaining({
          outputSchema: expect.any(Object),
          prompt: expect.stringContaining('meeting notes'),
        }),
        expect.anything(),
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

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'optimized_notes',
          }),
        ]),
      );

      expect(mockLlmGenerateObject.call).not.toHaveBeenCalled();
    });
  });
});
