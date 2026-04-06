import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { QueueResult, RunOptions, WorkflowOrchestrator } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { EventSubscriberService } from '../../persistence';
import { TaskSchedulerService } from '../../scheduler';
import { ExecutionScope } from '../utils';
import { CreateWorkflowService } from './create-workflow.service';

/**
 * Handles sub-workflow orchestration for the TypeScript-first workflow model.
 *
 * Injected sub-workflows call `.run(args, options)` which delegates to
 * `this.orchestrator.queue()`, provided by this service via DI.
 *
 * `queue()` creates the workflow entity, schedules it for execution,
 * and optionally registers an event subscriber for the callback transition.
 */
@Injectable()
export class WorkflowOrchestrationService implements WorkflowOrchestrator {
  private readonly logger = new Logger(WorkflowOrchestrationService.name);

  constructor(
    private readonly executionScope: ExecutionScope,
    private readonly createWorkflowService: CreateWorkflowService,
    @Inject(forwardRef(() => TaskSchedulerService))
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly eventSubscriberService: EventSubscriberService,
  ) {}

  async queue(args?: Record<string, unknown>, options?: RunOptions): Promise<QueueResult> {
    const ctx = this.executionScope.get();
    const context = ctx.getContext();

    if (!options?.blockName) {
      throw new Error('RunOptions.blockName is required to queue a sub-workflow.');
    }

    if (context.options?.stateless) {
      throw new Error('Sub-workflow launching requires stateful workflow execution.');
    }

    const blockName = options.blockName;
    const correlationId = randomUUID();
    const eventName = `workflow.${WorkflowState.Completed}`;

    const workflowEntity = await this.createWorkflowService.create(
      { id: context.workspaceId },
      {
        blockName,
        workspaceId: context.workspaceId,
        args: { ...args },
        eventCorrelationId: correlationId,
      },
      context.userId,
      context.parentWorkflowId,
      ctx.getInstance(),
    );

    await this.taskSchedulerService.addTask({
      id: 'sub_workflow_execution-' + randomUUID(),
      workspaceId: context.workspaceId,
      task: {
        name: 'sub_workflow_execution',
        type: 'run_workflow',
        user: context.userId,
        workspaceId: context.workspaceId,
        workflowId: workflowEntity.id,
        correlationId,
        blockName,
        args: { ...args },
        payload: {},
      },
    } satisfies ScheduledTask);

    if (options.callback?.transition) {
      await this.eventSubscriberService.registerSubscriber(
        context.parentWorkflowId,
        context.workflowId!,
        options.callback.transition,
        correlationId,
        eventName,
        context.userId,
        context.workspaceId,
      );
    }

    return {
      correlationId,
      workflowId: workflowEntity.id,
      eventName,
    };
  }
}
