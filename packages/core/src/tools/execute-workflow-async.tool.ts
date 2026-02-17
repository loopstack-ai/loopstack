import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Input, PipelineEntity, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
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
  options: z
    .object({
      runStateless: z.boolean().optional(),
    })
    .optional(),
});

type ExecuteWorkflowAsyncArgs = z.infer<typeof ExecuteWorkflowAsyncArgsSchema>;

@Injectable()
@Tool({
  config: {
    description: '',
  },
})
export class ExecuteWorkflowAsync implements ToolInterface<ExecuteWorkflowAsyncArgs> {
  protected readonly logger = new Logger(ExecuteWorkflowAsync.name);

  constructor(
    private readonly createPipelineService: CreatePipelineService,
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly eventSubscriberService: EventSubscriberService,
  ) {}

  @Input({
    schema: ExecuteWorkflowAsyncArgsSchema.strict(),
  })
  args: any;

  async execute(args: ExecuteWorkflowAsyncArgs, context: RunContext): Promise<ToolResult> {
    if (context.options.stateless) {
      throw new Error(
        `ExecuteWorkflowAsync tool can only be executed in stateful workflows! Make sure to execute the workflow with stateless=false or omit the option.`,
      );
    }

    const correlationId = randomUUID();

    let pipeline: PipelineEntity | undefined;
    if (!args.options?.runStateless) {
      pipeline = await this.createPipelineService.create(
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
      );
    }

    await this.eventSubscriberService.registerSubscriber(
      context.pipelineId,
      context.workflowId!,
      args.callback.transition,
      correlationId,
      `workflow.${WorkflowState.Completed}`,
      context.userId,
      context.workspaceId,
    );

    const job = await this.taskSchedulerService.addTask({
      id: 'sub_pipeline_execution-' + randomUUID(),
      task: {
        name: 'manual_execution',
        type: 'run_pipeline',
        user: context.userId,
        workspaceId: context.workspaceId,
        pipelineId: pipeline?.id,
        correlationId,
        blockName: args.workflow,
        args: {
          ...args.args,
        },
        payload: {},
      },
    } satisfies ScheduledTask);

    return {
      data: job?.data as ScheduledTask | undefined,
    };
  }
}
