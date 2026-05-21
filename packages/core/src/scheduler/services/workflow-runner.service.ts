import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  BaseWorkflow,
  RunResult,
  StatelessRunResult,
  SyncRunResult,
  WORKFLOW_ORCHESTRATOR,
  WorkflowArgs,
  WorkflowEntity,
  WorkflowOrchestrator,
  WorkflowRunnerOptions,
  WorkflowRunnerSyncOptions,
  WorkflowState,
} from '@loopstack/common';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { WorkflowService, WorkspaceService } from '../../persistence/index.js';
import { CreateWorkflowService } from '../../workflow-processor/services/create-workflow.service.js';
import { RootProcessorService } from '../../workflow-processor/services/root-processor.service.js';
import { TaskSchedulerService } from './task-scheduler.service.js';

@Injectable()
export class WorkflowRunner {
  private readonly logger = new Logger(WorkflowRunner.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly createWorkflowService: CreateWorkflowService,
    private readonly workspaceService: WorkspaceService,
    private readonly workflowService: WorkflowService,
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly rootProcessorService: RootProcessorService,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
  ) {}

  /**
   * Start a new workflow asynchronously via BullMQ.
   * Creates the workspace entity (find-or-create) and workflow entity, then schedules execution.
   */
  async run<W extends BaseWorkflow>(
    workflow: Type<W>,
    args: WorkflowArgs<W>,
    options: WorkflowRunnerOptions,
  ): Promise<RunResult> {
    const workerId = this.configService.getOrThrow<string>('auth.clientId');
    const appClassName = options.app.name;

    const workspace = await this.findOrCreateWorkspace(appClassName, options.userId, options.workspaceId);

    const workflowEntity = await this.createWorkflowService.create(
      { id: workspace.id },
      { alias: workflow.name, args: args as unknown },
      options.userId,
    );

    await this.taskSchedulerService.addTask({
      id: 'manual_workflow_execution-' + randomUUID(),
      workspaceId: workspace.id,
      task: {
        name: 'manual_execution',
        type: 'run_workflow',
        workflowId: workflowEntity.id,
        payload: {},
        user: options.userId,
      },
    } satisfies ScheduledTask);

    return {
      workerId,
      workspaceId: workspace.id,
      workflowId: workflowEntity.id,
    };
  }

  /**
   * Start a new workflow synchronously — execute inline and await the result.
   * By default persists everything (checkpoints, documents, workflow entity).
   * Pass `{ stateless: true }` to skip all persistence.
   */
  async runSync<W extends BaseWorkflow>(
    workflow: Type<W>,
    args: WorkflowArgs<W>,
    options: WorkflowRunnerSyncOptions,
  ): Promise<SyncRunResult | StatelessRunResult> {
    const appClassName = options.app.name;

    if (options.stateless) {
      const workspace = await this.findOrCreateWorkspace(appClassName, options.userId, options.workspaceId);

      const meta = await this.rootProcessorService.runStateless(
        {
          workspaceName: appClassName,
          alias: workflow.name,
          userId: options.userId,
          workspaceId: workspace.id,
          args: args as Record<string, unknown> | undefined,
        },
        {},
      );

      return {
        status: meta.status as WorkflowState,
        result: meta.result ?? null,
      };
    }

    // Stateful sync: create entities, then run inline
    const workerId = this.configService.getOrThrow<string>('auth.clientId');
    const workspace = await this.findOrCreateWorkspace(appClassName, options.userId, options.workspaceId);

    const workflowEntity = await this.createWorkflowService.create(
      { id: workspace.id },
      { alias: workflow.name, args: args as unknown },
      options.userId,
    );

    const fullEntity = await this.workflowService.getWorkflow(workflowEntity.id, options.userId, [
      'workspace',
      'workspace.environments',
    ]);

    if (!fullEntity) {
      throw new Error(`Workflow entity ${workflowEntity.id} not found after creation.`);
    }

    const meta = await this.rootProcessorService.runWorkflow(fullEntity, {});

    return {
      workflowId: workflowEntity.id,
      workspaceId: workspace.id,
      workerId,
      status: meta.status as WorkflowState,
      result: meta.result ?? null,
    };
  }

  /**
   * Run an existing workflow entity by ID. Validates user access, then schedules via BullMQ.
   */
  async runById(workflowId: string, userId: string): Promise<RunResult> {
    const workerId = this.configService.getOrThrow<string>('auth.clientId');

    const workflow = await this.workflowService.getWorkflow(workflowId, userId, []);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found.`);
    }

    await this.workflowService.setWorkflowStatus(workflow, WorkflowState.Pending);

    await this.taskSchedulerService.addTask({
      id: 'manual_workflow_execution-' + randomUUID(),
      workspaceId: workflow.workspaceId,
      task: {
        name: 'manual_execution',
        type: 'run_workflow',
        workflowId,
        payload: {},
        user: userId,
      },
    } satisfies ScheduledTask);

    return {
      workerId,
      workspaceId: workflow.workspaceId,
      workflowId,
    };
  }

  /**
   * Resume a paused workflow at the specified transition.
   */
  async resume(
    workflowId: string,
    userId: string,
    payload: Record<string, unknown>,
    options: { transition: string },
  ): Promise<void> {
    const workflow = await this.workflowService.getWorkflow(workflowId, userId, []);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found.`);
    }

    this.logger.log(`Resuming workflow ${workflowId}, transition=${options.transition}`);
    await this.orchestrator.resume(workflowId, payload, { transition: options.transition });
  }

  /**
   * Cancel a workflow and all its children.
   */
  async cancel(workflowId: string, userId: string): Promise<void> {
    const workflow = await this.workflowService.getWorkflow(workflowId, userId, []);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found.`);
    }

    this.logger.log(`Canceling workflow ${workflowId}`);
    await this.orchestrator.cancel(workflowId);
  }

  private async findOrCreateWorkspace(
    appClassName: string,
    userId: string,
    workspaceId?: string,
  ): Promise<WorkflowEntity['workspace'] & { id: string }> {
    if (workspaceId) {
      const workspace = await this.workspaceService.getWorkspace({ id: workspaceId }, userId);
      if (!workspace) {
        throw new Error(`Workspace with ID ${workspaceId} not found.`);
      }
      return workspace;
    }

    let workspace = await this.workspaceService.getWorkspace({ className: appClassName }, userId);
    if (!workspace) {
      workspace = await this.workspaceService.create({ className: appClassName, title: appClassName }, userId);
    }
    return workspace;
  }
}
