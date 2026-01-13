import { TestingModule } from '@nestjs/testing';
import { MeetingNotesWorkflow } from '../meeting-notes.workflow';
import {
  BlockExecutionContextDto,
  LoopCoreModule,
  WorkflowProcessorService,
} from '@loopstack/core';
import { CoreUiModule, CreateDocument } from '@loopstack/core-ui-module';
import { AiModule, AiGenerateDocument } from '@loopstack/ai-module';
import { MeetingNotesDocument } from '../documents/meeting-notes-document';
import { OptimizedNotesDocument } from '../documents/optimized-notes-document';
import { generateObjectFingerprint } from '@loopstack/common';
import { createWorkflowTest, ToolMock } from '@loopstack/testing';

describe('MeetingNotesWorkflow', () => {
  let module: TestingModule;
  let workflow: MeetingNotesWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateDocument: ToolMock;
  let mockAiGenerateDocument: ToolMock;

  const mockInitialNotes = {
    text: `
- meeting 1.1.2025
- budget: need 2 cut costs sarah said
- hire new person?? --> marketing
- vendor pricing - follow up needed by anna`,
  };

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(MeetingNotesWorkflow)
      .withImports(LoopCoreModule, CoreUiModule, AiModule)
      .withProvider(MeetingNotesDocument)
      .withProvider(OptimizedNotesDocument)
      .withToolOverride(CreateDocument)
      .withToolOverride(AiGenerateDocument)
      .compile();

    workflow = module.get(MeetingNotesWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateDocument = module.get(CreateDocument);
    mockAiGenerateDocument = module.get(AiGenerateDocument);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(workflow.tools).toContain('createDocument');
      expect(workflow.tools).toContain('aiGenerateDocument');
    });

    it('should apply default argument value', () => {
      const result = workflow.validate({});
      expect(result.inputText).toContain('meeting 1.1.2025');
    });
  });

  describe('initial step', () => {
    const context = new BlockExecutionContextDto({});

    it('should execute initial step and stop at waiting_for_response', async () => {
      mockCreateDocument.execute.mockResolvedValue({
        data: { content: mockInitialNotes },
      });

      const result = await processor.process(workflow, {}, context);

      // Should execute without errors and stop at waiting_for_response (manual step)
      expect(result.runtime.error).toBe(false);
      expect(result.runtime.stop).toBe(true);

      // Should call CreateDocument once for the initial form
      expect(mockCreateDocument.execute).toHaveBeenCalledTimes(1);
      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'input',
          update: {
            content: {
              text: expect.stringContaining('1.1.2025'),
            },
          },
        }),
        expect.anything(),
        expect.anything(),
      );

      // Verify history contains expected places
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('waiting_for_response');
    });
  });

  describe('user response step', () => {
    it('should process user response and generate optimized notes', async () => {
      const mockUserEditedNotes = {
        text: `Meeting Notes - January 1, 2025
- Budget discussion: need to cut costs (Sarah's input)
- Hiring: new person needed for marketing
- Vendor pricing: follow up needed by Anna`,
      };

      const mockOptimizedNotes = {
        date: '2025-01-01',
        summary: 'Budget and hiring discussion',
        participants: ['Sarah', 'Anna'],
        decisions: ['Cut costs', 'Hire for marketing'],
        actionItems: ['Follow up on vendor pricing'],
      };

      const args = { inputText: mockInitialNotes.text };

      // Create module with existing workflow state
      const moduleWithState = await createWorkflowTest()
        .forWorkflow(MeetingNotesWorkflow)
        .withImports(LoopCoreModule, CoreUiModule, AiModule)
        .withProvider(MeetingNotesDocument)
        .withProvider(OptimizedNotesDocument)
        .withToolOverride(CreateDocument)
        .withToolOverride(AiGenerateDocument)
        .withExistingWorkflow({
          id: '123',
          place: 'waiting_for_response',
          hashRecord: {
            options: generateObjectFingerprint(args),   // previously run with same arguments
          },
        })
        .compile();

      const workflowWithState = moduleWithState.get(MeetingNotesWorkflow);
      const processorWithState = moduleWithState.get(WorkflowProcessorService);

      const mockCreateDocumentWithState: ToolMock = moduleWithState.get(CreateDocument);
      const mockAiGenerateDocumentWithState: ToolMock = moduleWithState.get(AiGenerateDocument);

      mockCreateDocumentWithState.execute.mockResolvedValue({
        data: { content: mockUserEditedNotes },
      });
      mockAiGenerateDocumentWithState.execute.mockResolvedValue({
        data: { content: mockOptimizedNotes },
      });

      // Context with user payload for manual transition
      const contextWithPayload = new BlockExecutionContextDto({
        payload: {
          transition: {
            id: 'user_response',
            workflowId: '123',
            payload: mockUserEditedNotes,
          },
        },
      });

      const result = await processorWithState.process(
        workflowWithState,
        args,
        contextWithPayload,
      );

      // Should execute and stop at notes_optimized (next manual step)
      expect(result.runtime.error).toBe(false);
      expect(result.runtime.stop).toBe(true);

      // Should call CreateDocument once for user response
      expect(mockCreateDocumentWithState.execute).toHaveBeenCalledTimes(1);
      expect(mockCreateDocumentWithState.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'input',
        }),
        expect.anything(),
        expect.anything(),
      );

      // Should call AiGenerateDocument once
      expect(mockAiGenerateDocumentWithState.execute).toHaveBeenCalledTimes(1);
      expect(mockAiGenerateDocumentWithState.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
        }),
        expect.anything(),
        expect.anything(),
      );

      // Verify history contains expected places
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('response_received');
      expect(places).toContain('notes_optimized');

      await moduleWithState.close();
    });
  });

  describe('confirm step', () => {
    it('should complete workflow when user confirms optimized notes', async () => {
      const mockFinalNotes = {
        date: '2025-01-01',
        summary: 'Budget discussion with updates',
        participants: ['Sarah', 'Anna', 'Bob'],
        decisions: ['Cut costs by 15%'],
        actionItems: ['Follow up on vendor pricing by Friday'],
      };

      const args = { inputText: 'any text' };

      // Create module with existing workflow state after AI optimization
      const moduleWithState = await createWorkflowTest()
        .forWorkflow(MeetingNotesWorkflow)
        .withImports(LoopCoreModule, CoreUiModule, AiModule)
        .withProvider(MeetingNotesDocument)
        .withProvider(OptimizedNotesDocument)
        .withToolOverride(CreateDocument)
        .withToolOverride(AiGenerateDocument)
        .withExistingWorkflow({
          id: '123',
          place: 'notes_optimized',
          hashRecord: {
            options: generateObjectFingerprint(args),   // previously run with same arguments
          },
        })
        .compile();

      const workflowWithState = moduleWithState.get(MeetingNotesWorkflow);
      const processorWithState = moduleWithState.get(WorkflowProcessorService);

      const mockCreateDocumentWithState: ToolMock = moduleWithState.get(CreateDocument);

      mockCreateDocumentWithState.execute.mockResolvedValue({
        data: { content: mockFinalNotes },
      });

      // Context with user confirmation for manual transition
      const contextWithPayload = new BlockExecutionContextDto({
        payload: {
          transition: {
            id: 'confirm',
            workflowId: '123',
            payload: mockFinalNotes,
          },
        },
      });

      const result = await processorWithState.process(
        workflowWithState,
        args,
        contextWithPayload,
      );

      // Should complete and reach end state
      expect(result.runtime.error).toBe(false);
      expect(result.runtime.stop).toBe(false);

      // Should call CreateDocument once for final confirmation
      expect(mockCreateDocumentWithState.execute).toHaveBeenCalledTimes(1);

      // Verify history contains expected places including end
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('end');

      await moduleWithState.close();
    });
  });
});