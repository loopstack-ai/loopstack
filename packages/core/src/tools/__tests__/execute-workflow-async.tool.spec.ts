import { Test, TestingModule } from '@nestjs/testing';
import { RunContext } from '@loopstack/common';
import { EventSubscriberService } from '../../persistence';
import { TaskSchedulerService } from '../../scheduler';
import { CreatePipelineService } from '../../workflow-processor';
import { ExecuteWorkflowAsync } from '../execute-workflow-async.tool';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid-1234'),
}));

describe('ExecuteWorkflowAsync', () => {
  let tool: ExecuteWorkflowAsync;
  let createPipelineService: jest.Mocked<CreatePipelineService>;
  let taskSchedulerService: jest.Mocked<TaskSchedulerService>;
  let eventSubscriberService: jest.Mocked<EventSubscriberService>;

  const mockContext: RunContext = {
    root: 'root',
    index: 'index',
    userId: 'user-1',
    pipelineId: 'pipeline-1',
    workspaceId: 'workspace-1',
    workflowId: 'workflow-1',
    namespace: { id: 'ns-1' } as any,
    labels: [],
  } as RunContext;

  const mockPipeline = {
    id: 'new-pipeline-1',
    createdBy: 'user-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteWorkflowAsync,
        {
          provide: CreatePipelineService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockPipeline),
          },
        },
        {
          provide: TaskSchedulerService,
          useValue: {
            addTask: jest.fn().mockResolvedValue({ data: { id: 'job-1' } }),
          },
        },
        {
          provide: EventSubscriberService,
          useValue: {
            registerSubscriber: jest.fn().mockResolvedValue({ id: 'sub-1' }),
          },
        },
      ],
    }).compile();

    await module.init();

    tool = module.get<ExecuteWorkflowAsync>(ExecuteWorkflowAsync);
    createPipelineService = module.get(CreatePipelineService);
    taskSchedulerService = module.get(TaskSchedulerService);
    eventSubscriberService = module.get(EventSubscriberService);
  });

  describe('execute', () => {
    const baseArgs = {
      workflow: 'my-workflow',
      callback: {
        transition: 'on-complete',
      },
    };

    it('should create a pipeline with correct parameters', async () => {
      await tool.execute(baseArgs, mockContext);

      expect(createPipelineService.create).toHaveBeenCalledWith(
        { id: 'workspace-1' },
        {
          blockName: 'my-workflow',
          workspaceId: 'workspace-1',
          args: {},
        },
        'user-1',
        'pipeline-1',
      );
    });

    it('should pass workflow args to the pipeline', async () => {
      const argsWithPayload = {
        ...baseArgs,
        args: { key: 'value', nested: { foo: 'bar' } },
      };

      await tool.execute(argsWithPayload, mockContext);

      expect(createPipelineService.create).toHaveBeenCalledWith(
        { id: 'workspace-1' },
        {
          blockName: 'my-workflow',
          workspaceId: 'workspace-1',
          args: { key: 'value', nested: { foo: 'bar' } },
        },
        'user-1',
        'pipeline-1',
      );
    });

    it('should register an event subscriber for the callback', async () => {
      await tool.execute(baseArgs, mockContext);

      expect(eventSubscriberService.registerSubscriber).toHaveBeenCalledWith(
        'pipeline-1',
        'workflow-1',
        'on-complete',
        'new-pipeline-1',
        'completed',
        'user-1',
        'workspace-1',
      );
    });

    it('should schedule a task with the created pipeline id', async () => {
      await tool.execute(baseArgs, mockContext);

      expect(taskSchedulerService.addTask).toHaveBeenCalledWith({
        id: 'sub_pipeline_execution-test-uuid-1234',
        task: {
          name: 'manual_execution',
          type: 'run_pipeline',
          payload: {
            id: 'new-pipeline-1',
          },
          user: 'user-1',
        },
      });
    });

    it('should return the job data', async () => {
      const result = await tool.execute(baseArgs, mockContext);

      expect(result).toEqual({
        data: { id: 'job-1' },
      });
    });

    it('should return undefined data when scheduler returns null', async () => {
      taskSchedulerService.addTask.mockResolvedValue(null as any);

      const result = await tool.execute(baseArgs, mockContext);

      expect(result).toEqual({
        data: undefined,
      });
    });

    it('should handle args being undefined', async () => {
      const argsWithoutPayload = {
        workflow: 'my-workflow',
        callback: { transition: 'on-complete' },
      };

      await tool.execute(argsWithoutPayload, mockContext);

      expect(createPipelineService.create).toHaveBeenCalledWith(
        { id: 'workspace-1' },
        {
          blockName: 'my-workflow',
          workspaceId: 'workspace-1',
          args: {},
        },
        'user-1',
        'pipeline-1',
      );
    });

    it('should propagate errors from createPipelineService', async () => {
      createPipelineService.create.mockRejectedValue(new Error('Pipeline creation failed'));

      await expect(tool.execute(baseArgs, mockContext)).rejects.toThrow('Pipeline creation failed');
    });

    it('should propagate errors from eventSubscriberService', async () => {
      eventSubscriberService.registerSubscriber.mockRejectedValue(new Error('Subscriber registration failed'));

      await expect(tool.execute(baseArgs, mockContext)).rejects.toThrow('Subscriber registration failed');
    });

    it('should propagate errors from taskSchedulerService', async () => {
      taskSchedulerService.addTask.mockRejectedValue(new Error('Task scheduling failed'));

      await expect(tool.execute(baseArgs, mockContext)).rejects.toThrow('Task scheduling failed');
    });

    it('should call services in correct order', async () => {
      const callOrder: string[] = [];

      createPipelineService.create.mockImplementation(() => {
        callOrder.push('createPipeline');
        return mockPipeline as any;
      });

      eventSubscriberService.registerSubscriber.mockImplementation(() => {
        callOrder.push('registerSubscriber');
        return { id: 'sub-1' } as any;
      });

      taskSchedulerService.addTask.mockImplementation(() => {
        callOrder.push('addTask');
        return { data: { id: 'job-1' } } as any;
      });

      await tool.execute(baseArgs, mockContext);

      expect(callOrder).toEqual(['createPipeline', 'registerSubscriber', 'addTask']);
    });
  });
});
