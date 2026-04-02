import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BaseWorkflow, LaunchWorkflowOptions, LaunchWorkflowResult } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { EventSubscriberService } from '../../persistence';
import { TaskSchedulerService } from '../../scheduler';
import { ExecutionScope } from '../utils';
import { CreateWorkflowService } from './create-workflow.service';

/**
 * Handles sub-workflow orchestration for the TypeScript-first workflow model.
 *
 * Injected sub-workflows call `.run()` which the proxy redirects to `._run()`,
 * wired to `WorkflowOrchestrationService.launch()`.
 *
 * This replaces the old `Task` tool — launch creates the workflow entity,
 * schedules it for execution, and optionally registers an event subscriber
 * for the callback transition.
 */
@Injectable()
export class WorkflowOrchestrationService {
  private readonly logger = new Logger(WorkflowOrchestrationService.name);

  constructor(
    private readonly executionScope: ExecutionScope,
    private readonly createWorkflowService: CreateWorkflowService,
    @Inject(forwardRef(() => TaskSchedulerService))
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly eventSubscriberService: EventSubscriberService,
  ) {}

  async launch(
    blockName: string,
    workflow: BaseWorkflow,
    options: LaunchWorkflowOptions,
  ): Promise<LaunchWorkflowResult> {
    const ctx = this.executionScope.get();
    const context = ctx.getContext();

    if (context.options?.stateless) {
      throw new Error('Sub-workflow launching requires stateful workflow execution.');
    }

    const correlationId = randomUUID();
    const eventName = `workflow.${WorkflowState.Completed}`;

    const workflowEntity = await this.createWorkflowService.create(
      { id: context.workspaceId },
      {
        blockName,
        workspaceId: context.workspaceId,
        args: { ...options.args },
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
        args: { ...options.args },
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
      mode: 'async',
      correlationId,
      workflowId: workflowEntity.id,
      eventName,
    };
  }
}
