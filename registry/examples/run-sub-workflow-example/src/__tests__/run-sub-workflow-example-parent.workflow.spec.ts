import { TestingModule } from '@nestjs/testing';
import {
  RunContext,
  generateObjectFingerprint,
  getBlockConfig,
  getBlockDocuments,
  getBlockTools,
} from '@loopstack/common';
import { CreateDocument, LoopCoreModule, Task, WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleParentWorkflow } from '../run-sub-workflow-example-parent.workflow';
import { RunSubWorkflowExampleSubWorkflow } from '../run-sub-workflow-example-sub.workflow';

describe('RunSubWorkflowExampleParentWorkflow', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleParentWorkflow;
  let processor: WorkflowProcessorService;

  let mockTaskTool: ToolMock;
  let mockCreateDocumentTool: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleParentWorkflow)
      .withImports(LoopCoreModule, CreateChatMessageToolModule)
      .withProvider(RunSubWorkflowExampleSubWorkflow)
      .withToolOverride(CreateChatMessage)
      .withToolOverride(Task)
      .withToolOverride(CreateDocument)
      .compile();

    workflow = module.get(RunSubWorkflowExampleParentWorkflow);
    processor = module.get(WorkflowProcessorService);

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

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });

    it('should have all tools available via workflow.tools', () => {
      expect(getBlockTools(workflow)).toBeDefined();
      expect(Array.isArray(getBlockTools(workflow))).toBe(true);
      expect(getBlockTools(workflow)).toContain('createChatMessage');
      expect(getBlockTools(workflow)).toContain('task');
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

      mockTaskTool.execute.mockResolvedValue({
        data: {
          payload: { id: 'test-workflow-id' },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);

      expect(mockTaskTool.execute).toHaveBeenCalledTimes(1);
      expect(mockTaskTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: 'runSubWorkflowExampleSub',
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
      .withImports(LoopCoreModule, CreateChatMessageToolModule)
      .withProvider(RunSubWorkflowExampleSubWorkflow)
      .withToolOverride(CreateChatMessage)
      .withToolOverride(Task)
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
    const mockTask: ToolMock = module.get(Task);
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
    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('sub_workflow2_started');

    // sub_workflow_callback calls createDocument + createChatMessage,
    // then run_workflow2 fires automatically and calls task + createDocument
    expect(mockCreateDocument.execute).toHaveBeenCalledTimes(2);
    expect(mockCreateChatMessage.execute).toHaveBeenCalledTimes(1);
    expect(mockTask.execute).toHaveBeenCalledTimes(1);
    expect(mockTask.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'runSubWorkflowExampleSub',
        args: {},
        callback: { transition: 'sub_workflow2_callback' },
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should execute sub_workflow2_callback transition when resumed from sub_workflow2_started', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const args = {};

    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleParentWorkflow)
      .withImports(LoopCoreModule, CreateChatMessageToolModule)
      .withProvider(RunSubWorkflowExampleSubWorkflow)
      .withToolOverride(CreateChatMessage)
      .withToolOverride(Task)
      .withToolOverride(CreateDocument)
      .withExistingWorkflow({
        place: 'sub_workflow2_started',
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
          id: 'sub_workflow2_callback',
          workflowId,
          payload: { message: 'Hello from sub workflow 2!' },
        },
      },
    } as unknown as RunContext;

    const result = await processor.process(workflow, args, context);

    expect(result).toBeDefined();
    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    expect(mockCreateDocument.execute).toHaveBeenCalledTimes(1);
    expect(mockCreateChatMessage.execute).toHaveBeenCalledTimes(1);
  });
});
