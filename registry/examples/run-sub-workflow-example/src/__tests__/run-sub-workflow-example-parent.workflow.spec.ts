import { TestingModule } from '@nestjs/testing';
import {
  RunContext,
  generateObjectFingerprint,
  getBlockConfig,
  getBlockDocuments,
  getBlockTools,
} from '@loopstack/common';
import { ExecuteWorkflowAsync, WorkflowProcessorService } from '@loopstack/core';
import { CoreUiModule, CreateDocument } from '@loopstack/core-ui-module';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleParentWorkflow } from '../run-sub-workflow-example-parent.workflow';

describe('RunSubWorkflowExampleParentWorkflow', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleParentWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateChatMessageTool: ToolMock;
  let mockExecuteWorkflowAsyncTool: ToolMock;
  let mockCreateDocumentTool: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleParentWorkflow)
      .withImports(CoreUiModule, CreateChatMessageToolModule)
      .withToolOverride(CreateChatMessage)
      .withToolOverride(ExecuteWorkflowAsync)
      .withToolOverride(CreateDocument)
      .compile();

    workflow = module.get(RunSubWorkflowExampleParentWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateChatMessageTool = module.get(CreateChatMessage);
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

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });

    it('should have all tools available via workflow.tools', () => {
      expect(getBlockTools(workflow)).toBeDefined();
      expect(Array.isArray(getBlockTools(workflow))).toBe(true);
      expect(getBlockTools(workflow)).toContain('createChatMessage');
      expect(getBlockTools(workflow)).toContain('executeWorkflowAsync');
      expect(getBlockTools(workflow)).toContain('createDocument');
      expect(getBlockTools(workflow)).toHaveLength(3);
    });

    it('should have all documents available', () => {
      expect(getBlockDocuments(workflow)).toBeDefined();
      expect(Array.isArray(getBlockDocuments(workflow))).toBe(true);
      expect(getBlockDocuments(workflow)).toContain('linkDocument');
      expect(getBlockDocuments(workflow)).toHaveLength(1);
    });
  });

  describe('workflow execution', () => {
    it('should execute run_workflow transition', async () => {
      const context = {} as RunContext;

      mockExecuteWorkflowAsyncTool.execute.mockResolvedValue({
        data: {
          task: {
            payload: { id: 'test-pipeline-id' },
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.error).toBe(false);
      expect(result.stop).toBe(true);

      expect(mockCreateChatMessageTool.execute).toHaveBeenCalledTimes(1);
      expect(mockExecuteWorkflowAsyncTool.execute).toHaveBeenCalledTimes(1);
      expect(mockExecuteWorkflowAsyncTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: 'runSubWorkflowExampleSubWorkflow',
          args: {},
          callback: { transition: 'sub_workflow_callback' },
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(mockCreateDocumentTool.execute).toHaveBeenCalledTimes(1);
    });
  });
});

describe('RunSubWorkflowExampleParentWorkflow with existing entity', () => {
  let module: TestingModule;

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should execute sub_workflow_callback transition when resumed from sub_workflow_started', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const args = {};

    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleParentWorkflow)
      .withImports(CoreUiModule, CreateChatMessageToolModule)
      .withToolOverride(CreateChatMessage)
      .withToolOverride(ExecuteWorkflowAsync)
      .withToolOverride(CreateDocument)
      .withExistingWorkflow({
        place: 'sub_workflow_started',
        inputData: args,
        id: workflowId,
        hashRecord: {
          options: generateObjectFingerprint(args),
        },
      })
      .compile();

    const workflow = module.get(RunSubWorkflowExampleParentWorkflow);
    const processor = module.get(WorkflowProcessorService);
    const mockCreateChatMessage: ToolMock = module.get(CreateChatMessage);
    const mockCreateDocument: ToolMock = module.get(CreateDocument);

    const context = {
      payload: {
        transition: {
          id: 'sub_workflow_callback',
          workflowId,
          payload: { message: 'Hi mom!' },
        },
      },
    } as unknown as RunContext;

    const result = await processor.process(workflow, args, context);

    expect(result).toBeDefined();
    expect(result.error).toBe(false);
    expect(result.place).toBe('end');

    expect(mockCreateDocument.execute).toHaveBeenCalledTimes(1);
    expect(mockCreateChatMessage.execute).toHaveBeenCalledTimes(1);
  });
});
