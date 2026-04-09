import { TestingModule } from '@nestjs/testing';
import { RunContext, WorkflowEntity, getBlockConfig, getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleParentWorkflow } from '../run-sub-workflow-example-parent.workflow';
import { RunSubWorkflowExampleSubWorkflow } from '../run-sub-workflow-example-sub.workflow';

describe('RunSubWorkflowExampleParentWorkflow', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleParentWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateChatMessageTool: ToolMock;

  const mockSubWorkflow = {
    run: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleParentWorkflow)
      .withImports(LoopCoreModule, CreateChatMessageToolModule)
      .withMock(RunSubWorkflowExampleSubWorkflow, mockSubWorkflow)
      .withToolOverride(CreateChatMessage)
      .compile();

    workflow = module.get(RunSubWorkflowExampleParentWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateChatMessageTool = module.get(CreateChatMessage);
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

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });

    it('should have all tools available via workflow.tools', () => {
      expect(getBlockTools(workflow)).toBeDefined();
      expect(Array.isArray(getBlockTools(workflow))).toBe(true);
      expect(getBlockTools(workflow)).toContain('createChatMessage');
      expect(getBlockTools(workflow)).toHaveLength(1);
    });
  });

  describe('workflow execution', () => {
    it('should execute run_workflow transition and stop at sub_workflow_started', async () => {
      const context = createStatelessContext();

      mockSubWorkflow.run.mockResolvedValue({
        workflowId: 'test-workflow-id',
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('sub_workflow_started');

      expect(mockSubWorkflow.run).toHaveBeenCalledTimes(1);
      expect(mockSubWorkflow.run).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          alias: 'runSubWorkflowExampleSub',
          callback: { transition: 'subWorkflowCallback' },
        }),
      );

      // Link document should have been created
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'LinkDocument',
            content: expect.objectContaining({
              label: 'Executing Sub-Workflow...',
              workflowId: 'test-workflow-id',
            }),
          }),
        ]),
      );
    });

    it('should execute sub_workflow_callback when resumed from sub_workflow_started', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      mockSubWorkflow.run.mockResolvedValue({
        workflowId: 'test-workflow-id-2',
      });

      const context = {
        workflowEntity: {
          id: workflowId,
          place: 'sub_workflow_started',
          documents: [],
        } as Partial<WorkflowEntity>,
        payload: {
          transition: {
            id: 'subWorkflowCallback',
            workflowId,
            payload: { workflowId, status: 'completed', data: { message: 'Hi mom!' } },
          },
        },
      } as unknown as RunContext;

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('sub_workflow2_started');

      // subWorkflowCallback calls createChatMessage
      expect(mockCreateChatMessageTool.call).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'A message from sub workflow 1: Hi mom!',
        },
        undefined,
      );

      // runWorkflow2 fires automatically and calls sub workflow again
      expect(mockSubWorkflow.run).toHaveBeenCalledTimes(1);
      expect(mockSubWorkflow.run).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          alias: 'runSubWorkflowExampleSub',
          callback: { transition: 'subWorkflow2Callback' },
        }),
      );
    });

    it('should execute sub_workflow2_callback when resumed from sub_workflow2_started', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      const context = {
        workflowEntity: {
          id: workflowId,
          place: 'sub_workflow2_started',
          documents: [],
        } as Partial<WorkflowEntity>,
        payload: {
          transition: {
            id: 'subWorkflow2Callback',
            workflowId,
            payload: { workflowId, status: 'completed', data: { message: 'Hello from sub workflow 2!' } },
          },
        },
      } as unknown as RunContext;

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');

      expect(mockCreateChatMessageTool.call).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'A message from sub workflow 2: Hello from sub workflow 2!',
        },
        undefined,
      );
    });
  });
});
