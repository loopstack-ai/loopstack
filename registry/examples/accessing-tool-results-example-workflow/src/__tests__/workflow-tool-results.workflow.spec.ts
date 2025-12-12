import { TestingModule } from '@nestjs/testing';
import { WorkflowToolResultsWorkflow } from '../workflow-tool-results.workflow';
import {
  BlockExecutionContextDto,
  createWorkflowTest,
  LoopCoreModule,
  ToolMock,
  WorkflowProcessorService,
} from '@loopstack/core';
import { CoreUiModule, CreateChatMessage } from '@loopstack/core-ui-module';
import { CreateValue } from '@loopstack/create-value-tool';

describe('WorkflowToolResultsWorkflow', () => {
  let module: TestingModule;
  let workflow: WorkflowToolResultsWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateValue: ToolMock;
  let mockCreateChatMessage: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(WorkflowToolResultsWorkflow)
      .withImports(LoopCoreModule, CoreUiModule)
      .withToolMock(CreateValue)
      .withToolOverride(CreateChatMessage)
      .compile();

    workflow = module.get(WorkflowToolResultsWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateValue = module.get(CreateValue);
    mockCreateChatMessage = module.get(CreateChatMessage);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(workflow).toBeDefined();
  });

  it('should have extractMessage helper', () => {
    expect(workflow.helpers).toContain('extractMessage');
  });

  describe('tool result access', () => {
    it('should access tool results by call id and index in same transition', async () => {
      const context = new BlockExecutionContextDto({});
      mockCreateValue.execute.mockResolvedValue({ data: 'Hello World.' });
      mockCreateChatMessage.execute.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      // Verify CreateValue was called
      expect(mockCreateValue.execute).toHaveBeenCalledWith(
        { input: 'Hello World.' },
        expect.anything(),
        expect.anything(),
      );

      // Verify CreateChatMessage received resolved template values
      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Data from specific call id: Hello World.',
        },
        expect.anything(),
        expect.anything(),
      );

      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Data from first tool call: Hello World.',
        },
        expect.anything(),
        expect.anything(),
      );
    });

    it('should access tool results from previous transition', async () => {
      const context = new BlockExecutionContextDto({});
      mockCreateValue.execute.mockResolvedValue({ data: 'Hello World.' });
      mockCreateChatMessage.execute.mockResolvedValue({ data: undefined });

      const result = await processor.process(workflow, {}, context);

      // Should complete both transitions
      const history = result.state.caretaker.getHistory();
      expect(history.some((h) => h.step === 'create_some_data')).toBe(true);
      expect(history.some((h) => h.step === 'access_data')).toBe(true);

      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Data from previous transition: Hello World.',
        },
        expect.anything(),
        expect.anything(),
      );
    });

    it('should access tool results using custom helper', async () => {
      const context = new BlockExecutionContextDto({});
      mockCreateValue.execute.mockResolvedValue({ data: 'Hello World.' });
      mockCreateChatMessage.execute.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Data access using custom helper: Hello World.',
        },
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
