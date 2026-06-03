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
  WorkflowPayload,
  WorkflowRunResult,
  WorkflowRunnerOptions,
  WorkflowRunnerSyncOptions,
  WorkflowState,
} from '@loopstack/common';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { WorkflowService, WorkspaceService } from '../../persistence/index.js';
import { CreateWorkflowService } from '../../workflow-processor/services/create-workflow.service.js';
import { RootProcessorService } from '../../workflow-processor/services/root-processor.service.js';
import { WorkflowRegistryService } from '../../workflow-processor/services/workflow-registry.service.js';
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
    private readonly workflowRegistryService: WorkflowRegistryService,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
  ) {}

  /**
   * Execute from a controller — handles start, resume, and retry based on payload shape.
   */
  async execute<TArgs>(
    workflow: Type<BaseWorkflow<TArgs>> | string,
    payload: WorkflowPayload<TArgs>,
    options: { userId: string; appName: string; labels?: string[] },
  ): Promise<WorkflowRunResult> {
    // Continue existing workflow (optionally applying a waiting transition)
    if (payload.workflowId) {
      const result = await this.runById(payload.workflowId, options.userId, {
        transition: payload.transition,
      });
      return {
        workflowId: result.workflowId,
        workspaceId: result.workspaceId,
        status: WorkflowState.Pending,
      };
    }

    // Start new workflow
    const labels = payload.labels ?? options.labels;
    const { instance, workflowName } = this.workflowRegistryService.resolve(workflow as Type | string);
    const workspace = await this.findOrCreateWorkspace(options.appName, options.userId, payload.workspaceId);
    const workflowEntity = await this.createWorkflowService.create(
      instance,
      { id: workspace.id },
      { workflowName, args: payload.args as unknown, labels },
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
      workflowId: workflowEntity.id,
      workspaceId: workspace.id,
      status: WorkflowState.Pending,
    };
  }

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
    const { instance, workflowName } = this.workflowRegistryService.resolve(workflow);

    const workspace = await this.findOrCreateWorkspace(options.appName, options.userId, options.workspaceId);

    const workflowEntity = await this.createWorkflowService.create(
      instance,
      { id: workspace.id },
      { workflowName, args: args as unknown, labels: options.labels },
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
    const { instance, workflowName } = this.workflowRegistryService.resolve(workflow);

    if (options.stateless) {
      const workspace = await this.findOrCreateWorkspace(options.appName, options.userId, options.workspaceId);

      const meta = await this.rootProcessorService.runStateless(
        instance,
        {
          workflowName,
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
    const workspace = await this.findOrCreateWorkspace(options.appName, options.userId, options.workspaceId);

    const workflowEntity = await this.createWorkflowService.create(
      instance,
      { id: workspace.id },
      { workflowName, args: args as unknown, labels: options.labels },
      options.userId,
    );

    const fullEntity = await this.workflowService.getWorkflow(workflowEntity.id, options.userId, ['workspace']);

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
   * The workflow continues from its current place. When a transition is provided, it applies
   * that waiting transition before continuing.
   */
  async runById(
    workflowId: string,
    userId: string,
    payload: { transition?: { id: string; workflowId?: string; payload?: unknown } } = {},
  ): Promise<RunResult> {
    const workerId = this.configService.getOrThrow<string>('auth.clientId');

    const workflow = await this.workflowService.getWorkflow(workflowId, userId, []);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found.`);
    }

    await this.workflowService.setWorkflowStatus(workflow, WorkflowState.Pending);

    const taskPayload: Record<string, unknown> = {};
    if (payload.transition) {
      taskPayload.transition = {
        id: payload.transition.id,
        workflowId: payload.transition.workflowId ?? workflowId,
        payload: payload.transition.payload ?? {},
      };
    }

    await this.taskSchedulerService.addTask({
      id: 'manual_workflow_execution-' + randomUUID(),
      workspaceId: workflow.workspaceId,
      task: {
        name: 'manual_execution',
        type: 'run_workflow',
        workflowId,
        payload: taskPayload,
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
    appName: string,
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

    let workspace = await this.workspaceService.getWorkspace({ appName }, userId);
    if (!workspace) {
      workspace = await this.workspaceService.create({ appName, title: appName }, userId);
    }
    return workspace;
  }
}
