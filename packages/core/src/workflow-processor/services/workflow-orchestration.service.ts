import { Injectable, Logger, Type } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  LinkDocument,
  QueueResult,
  ResumeOptions,
  RunOptions,
  SubWorkflowShow,
  WorkflowEntity,
  WorkflowOrchestrator,
  WorkflowState,
} from '@loopstack/common';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { TransitionAbortedError } from '../../common/index.js';
import { WorkflowService } from '../../persistence/services/workflow.service.js';
import { TaskSchedulerService } from '../../scheduler/services/task-scheduler.service.js';
import { ExecutionScope } from '../utils/index.js';
import { CreateWorkflowService } from './create-workflow.service.js';
import { DocumentStore } from './document-store.service.js';
import { WorkflowRegistryService } from './workflow-registry.service.js';

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
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly workflowService: WorkflowService,
    private readonly workflowRegistryService: WorkflowRegistryService,
    private readonly documentStore: DocumentStore,
  ) {}

  async queue(workflowClass: Type, args?: Record<string, unknown>, options?: RunOptions): Promise<QueueResult> {
    const scope = this.executionScope.get();

    // Refuse to spawn a sub-workflow from an abandoned (timed-out) transition.
    if (scope.abortController.signal.aborted) {
      throw new TransitionAbortedError();
    }

    if (scope.options?.stateless) {
      throw new Error('Sub-workflow launching requires stateful workflow execution.');
    }

    const { instance: workflow, workflowName } = this.workflowRegistryService.resolve(workflowClass);

    const workflowEntity = await this.createWorkflowService.create(
      workflow,
      { id: scope.workspaceId },
      {
        workflowName,
        workspaceId: scope.workspaceId,
        args: { ...args },
        callbackTransition: options?.callback?.transition ?? null,
        callbackMetadata: options?.callback?.metadata ?? null,
      },
      scope.userId,
      scope.workflowId,
    );

    await this.taskSchedulerService.addTask({
      id: 'sub_workflow_execution-' + randomUUID(),
      workspaceId: scope.workspaceId,
      task: {
        name: 'sub_workflow_execution',
        type: 'run_workflow',
        user: scope.userId,
        workspaceId: scope.workspaceId,
        workflowId: workflowEntity.id,
        workflowName,
        args: { ...args },
        payload: {},
      },
    } satisfies ScheduledTask);

    await this.persistSubWorkflowLink(workflowEntity.id, workflowName, options);

    return {
      workflowId: workflowEntity.id,
    };
  }

  private async persistSubWorkflowLink(
    childWorkflowId: string,
    workflowName: string,
    options: RunOptions | undefined,
  ): Promise<void> {
    const show: SubWorkflowShow = options?.show ?? 'inline';
    if (show === 'hidden') return;

    const label = options?.label ?? workflowName;
    await this.documentStore.save(
      LinkDocument,
      {
        label,
        workflowId: childWorkflowId,
        embed: show === 'inline',
        expanded: show === 'inline',
      },
      { key: `link_${childWorkflowId}` },
    );
  }

  async resume(workflowId: string, payload: Record<string, unknown>, options: ResumeOptions): Promise<void> {
    const workflow = await this.workflowService.findById(workflowId);

    if (!workflow) {
      throw new Error(`Workflow with id ${workflowId} not found for resume.`);
    }

    this.logger.log(`Scheduling resume for workflow ${workflowId}, transition=${options.transition}`);

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

  async cancel(workflowId: string): Promise<void> {
    const workflow = await this.workflowService.findById(workflowId);
    if (!workflow) {
      this.logger.warn(`Workflow ${workflowId} not found for cancellation — skipping.`);
      return;
    }

    // Skip if already in a terminal state
    if (
      workflow.status === WorkflowState.Completed ||
      workflow.status === WorkflowState.Failed ||
      workflow.status === WorkflowState.Canceled
    ) {
      return;
    }

    this.logger.log(`Canceling workflow ${workflowId} (status: ${workflow.status})`);

    // 1. Recursively cancel all children first
    const children = await this.workflowService.findChildrenByParentId(workflowId);
    for (const child of children) {
      await this.cancel(child.id);
    }

    // 2. Remove queued BullMQ jobs for this workflow
    await this.taskSchedulerService.removeTasksByWorkflowId(workflowId);

    // 3. Set status to Canceled
    await this.workflowService.setWorkflowStatus(workflow, WorkflowState.Canceled);

    // 4. Trigger parent callback if configured
    if (workflow.parentId && workflow.callbackTransition) {
      await this.complete(workflow);
    }
  }

  async cancelChildren(parentWorkflowId: string): Promise<void> {
    const children = await this.workflowService.findChildrenByParentId(parentWorkflowId);
    for (const child of children) {
      await this.cancel(child.id);
    }
  }

  async complete(workflowEntity: WorkflowEntity): Promise<void> {
    if (!workflowEntity.parentId || !workflowEntity.callbackTransition) {
      return;
    }

    this.logger.log(
      `Workflow ${workflowEntity.id} ${workflowEntity.status} — triggering parent callback: ` +
        `parentId=${workflowEntity.parentId}, transition=${workflowEntity.callbackTransition}`,
    );

    try {
      await this.resume(
        workflowEntity.parentId,
        {
          workflowId: workflowEntity.id,
          status: workflowEntity.status,
          hasError: workflowEntity.hasError ?? false,
          errorMessage: workflowEntity.errorMessage ?? null,
          data: workflowEntity.result ?? null,
          ...(workflowEntity.callbackMetadata ? { meta: workflowEntity.callbackMetadata } : {}),
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
