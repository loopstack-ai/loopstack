import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import {
  CreatePipelineService,
  ToolBase,
  WorkflowExecution,
} from '../workflow-processor';
import { TaskSchedulerService } from '../scheduler';
import { EventSubscriberService } from '../persistence';
import { randomUUID } from 'node:crypto';
import type { ScheduledTask } from '@loopstack/contracts/types';

const ExecuteWorkflowAsyncArgsSchema = z.object({
  workflow: z.string(),
  args: z.any().optional(),
  callback: z.object({
    transition: z.string(),
  }),
});

type ExecuteWorkflowAsyncArgs = z.infer<typeof ExecuteWorkflowAsyncArgsSchema>;

@Injectable()
@BlockConfig({
  config: {
    description: '',
  },
})
@WithArguments(ExecuteWorkflowAsyncArgsSchema.strict())
export class ExecuteWorkflowAsync extends ToolBase<ExecuteWorkflowAsyncArgs> {
  protected readonly logger = new Logger(ExecuteWorkflowAsync.name);

  constructor(
    private readonly createPipelineService: CreatePipelineService,
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly eventSubscriberService: EventSubscriberService,
  ) {
    super();
  }

  async execute(
    args: ExecuteWorkflowAsyncArgs,
    ctx: WorkflowExecution,
  ): Promise<ToolResult> {
    const pipeline = await this.createPipelineService.create(
      {
        id: ctx.context.workspaceId,
      },
      {
        blockName: args.workflow,
        workspaceId: ctx.context.workspaceId,
        args: {
          ...args.args,
        },
      },
      ctx.context.userId,
    );

    await this.eventSubscriberService.registerSubscriber(
      ctx.context.pipelineId,
      ctx.entity.id,
      args.callback.transition,
      pipeline.id,
      'completed',
      ctx.context.userId,
      ctx.context.workspaceId,
    );

    const job = await this.taskSchedulerService.addTask({
      id: 'sub_pipeline_execution-' + randomUUID(),
      task: {
        name: 'manual_execution',
        type: 'run_pipeline',
        payload: {
          id: pipeline.id,
        },
        user: pipeline.createdBy,
      },
    } satisfies ScheduledTask);

    return {
      data: job?.data,
    };
  }
}
