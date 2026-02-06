import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Tool, ToolInterface, ToolResult, WithArguments, WorkflowExecution } from '@loopstack/common';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { EventSubscriberService } from '../persistence';
import { TaskSchedulerService } from '../scheduler';
import { CreatePipelineService } from '../workflow-processor';

const ExecuteWorkflowAsyncArgsSchema = z.object({
  workflow: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
  callback: z.object({
    transition: z.string(),
  }),
});

type ExecuteWorkflowAsyncArgs = z.infer<typeof ExecuteWorkflowAsyncArgsSchema>;

@Injectable()
@Tool({
  config: {
    description: '',
  },
})
@WithArguments(ExecuteWorkflowAsyncArgsSchema.strict())
export class ExecuteWorkflowAsync implements ToolInterface<ExecuteWorkflowAsyncArgs> {
  protected readonly logger = new Logger(ExecuteWorkflowAsync.name);

  constructor(
    private readonly createPipelineService: CreatePipelineService,
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly eventSubscriberService: EventSubscriberService,
  ) {}

  async execute(args: ExecuteWorkflowAsyncArgs, ctx: WorkflowExecution): Promise<ToolResult> {
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
      ctx.context.pipelineId,
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
      data: job?.data as ScheduledTask | undefined,
    };
  }
}
