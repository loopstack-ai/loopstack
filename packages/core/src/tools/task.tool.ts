import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  BlockInterface,
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
} from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { EventSubscriberService } from '../persistence';
import { TaskSchedulerService } from '../scheduler';
import { CreatePipelineService } from '../workflow-processor';

const TaskArgsSchema = z.object({
  workflow: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
  callback: z
    .object({
      transition: z.string(),
    })
    .optional(),
});

type TaskArgs = z.infer<typeof TaskArgsSchema>;

@Injectable()
@Tool({
  config: {
    description: 'Execute a workflow as a sub-task',
  },
})
export class Task implements ToolInterface<TaskArgs> {
  protected readonly logger = new Logger(Task.name);

  constructor(
    private readonly createPipelineService: CreatePipelineService,
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly eventSubscriberService: EventSubscriberService,
  ) {}

  @Input({
    schema: TaskArgsSchema,
  })
  args: TaskArgs;

  async execute(args: TaskArgs, context: RunContext, parent?: WorkflowInterface | BlockInterface): Promise<ToolResult> {
    this.logger.debug(
      `[DEBUG] Task.execute called: workflow=${args.workflow}, parent=${parent?.constructor?.name ?? 'UNDEFINED'}, pipelineId=${context.pipelineId ?? 'UNDEFINED'}`,
    );
    if (context.options.stateless) {
      throw new Error('Task tool requires stateful workflow execution.');
    }

    const correlationId = randomUUID();

    const pipeline = await this.createPipelineService.create(
      {
        id: context.workspaceId,
      },
      {
        blockName: args.workflow,
        workspaceId: context.workspaceId,
        args: {
          ...args.args,
        },
        eventCorrelationId: correlationId,
      },
      context.userId,
      context.pipelineId,
      parent,
    );

    await this.taskSchedulerService.addTask({
      id: 'sub_pipeline_execution-' + randomUUID(),
      workspaceId: context.workspaceId,
      task: {
        name: 'sub_pipeline_execution',
        type: 'run_pipeline',
        user: context.userId,
        workspaceId: context.workspaceId,
        pipelineId: pipeline.id,
        correlationId,
        blockName: args.workflow,
        args: {
          ...args.args,
        },
        payload: {},
      },
    } satisfies ScheduledTask);

    // When callback is provided (direct YAML usage), register the subscriber here.
    // When callback is omitted (delegate usage), delegateToolCalls handles the subscriber.
    if (args.callback?.transition) {
      await this.eventSubscriberService.registerSubscriber(
        context.pipelineId,
        context.workflowId!,
        args.callback.transition,
        correlationId,
        `workflow.${WorkflowState.Completed}`,
        context.userId,
        context.workspaceId,
      );
    }

    return {
      data: {
        mode: 'async',
        correlationId,
        pipelineId: pipeline.id,
        eventName: `workflow.${WorkflowState.Completed}`,
      },
    };
  }

  async complete(result: unknown): Promise<ToolResult> {
    const data = result as Record<string, unknown>;
    return await Promise.resolve({ data: data?.result ?? result });
  }
}
