import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CallbackOptions,
  QueueResult,
  RunOptions,
  WorkflowEntity,
  WorkflowInterface,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { WorkflowService } from '../../persistence';
import { TaskSchedulerService } from '../../scheduler';
import { ExecutionScope } from '../utils';
import { CreateWorkflowService } from './create-workflow.service';

/**
 * Handles sub-workflow orchestration for the TypeScript-first workflow model.
 *
 * Lifecycle methods:
 * - `queue()` — creates a sub-workflow entity and schedules it for execution
 * - `callback()` — universal resume API: schedules a BullMQ task to resume a paused workflow
 * - `complete()` — called when a workflow finishes; triggers parent callback if configured
 */
@Injectable()
export class WorkflowOrchestrationService implements WorkflowOrchestrator {
  private readonly logger = new Logger(WorkflowOrchestrationService.name);

  constructor(
    private readonly executionScope: ExecutionScope,
    private readonly createWorkflowService: CreateWorkflowService,
    @Inject(forwardRef(() => TaskSchedulerService))
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly workflowService: WorkflowService,
  ) {}

  async queue(args?: Record<string, unknown>, options?: RunOptions): Promise<QueueResult> {
    const ctx = this.executionScope.get();
    const context = ctx.getContext();

    if (!options?.alias) {
      throw new Error('RunOptions.alias is required to queue a sub-workflow.');
    }

    if (context.options?.stateless) {
      throw new Error('Sub-workflow launching requires stateful workflow execution.');
    }

    const alias = options.alias;
    const workflowInstance = options._workflowInstance as WorkflowInterface | undefined;

    const workflowEntity = await this.createWorkflowService.create(
      { id: context.workspaceId },
      {
        alias,
        workspaceId: context.workspaceId,
        args: { ...args },
        callbackTransition: options?.callback?.transition ?? null,
        callbackMetadata: options?.callback?.metadata ?? null,
      },
      context.userId,
      context.parentWorkflowId,
      workflowInstance,
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
        alias,
        args: { ...args },
        payload: {},
      },
    } satisfies ScheduledTask);

    return {
      workflowId: workflowEntity.id,
    };
  }

  async callback(workflowId: string, payload: Record<string, unknown>, options: CallbackOptions): Promise<void> {
    const workflow = await this.workflowService.findById(workflowId);

    if (!workflow) {
      throw new Error(`Workflow with id ${workflowId} not found for callback.`);
    }

    this.logger.log(`Scheduling callback for workflow ${workflowId}, transition=${options.transition}`);

    await this.taskSchedulerService.addTask({
      id: 'callback_execution-' + randomUUID(),
      workspaceId: workflow.workspaceId,
      task: {
        name: 'callback_execution',
        type: 'run_workflow',
        workflowId: workflowId,
        payload: {
          transition: {
            id: options.transition,
            workflowId: workflowId,
            payload,
          },
        },
        user: workflow.createdBy,
      },
    } satisfies ScheduledTask);
  }

  async complete(workflowEntity: WorkflowEntity): Promise<void> {
    if (!workflowEntity.parentId || !workflowEntity.callbackTransition) {
      return;
    }

    this.logger.log(
      `Workflow ${workflowEntity.id} completed — triggering parent callback: ` +
        `parentId=${workflowEntity.parentId}, transition=${workflowEntity.callbackTransition}`,
    );

    try {
      await this.callback(
        workflowEntity.parentId,
        {
          workflowId: workflowEntity.id,
          status: workflowEntity.status,
          data: workflowEntity.result ?? null,
          ...(workflowEntity.callbackMetadata ? { _subscriberMetadata: workflowEntity.callbackMetadata } : {}),
        },
        { transition: workflowEntity.callbackTransition },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to trigger parent callback for workflow ${workflowEntity.id}: ${message}`);
      throw error;
    }
  }
}
