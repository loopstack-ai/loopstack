import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  RunContext,
  WORKFLOW_ORCHESTRATOR,
  WorkflowEntity,
  WorkflowInterface,
  WorkflowMetadataInterface,
  WorkflowOrchestrator,
  WorkspaceEnvironmentContextDto,
} from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import { RunPayload } from '@loopstack/contracts/schemas';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { WorkflowService } from '../../persistence';
import { TaskSchedulerService } from '../../scheduler';
import { BlockDiscoveryService } from './block-discovery.service';
import { BlockProcessor } from './block-processor.service';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly blockProcessor: BlockProcessor,
    private readonly blockDiscoveryService: BlockDiscoveryService,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    @Inject(forwardRef(() => TaskSchedulerService))
    private readonly taskSchedulerService: TaskSchedulerService,
  ) {}

  private resolveWorkflowConfig(workflow: WorkflowEntity): WorkflowInterface {
    if (!workflow.className) {
      throw new Error(`Workflow entity ${workflow.id} has no className. Cannot resolve.`);
    }

    const workflowConfig = this.blockDiscoveryService.getWorkflowByName(workflow.className);
    if (!workflowConfig) {
      throw new Error(`Workflow ${workflow.className} not found. Ensure it is registered as a provider in the module.`);
    }

    return workflowConfig;
  }

  private resolveWorkflowByNames(alias: string): WorkflowInterface {
    const workflow = this.blockDiscoveryService.getWorkflowByName(alias);
    if (!workflow) {
      throw new BadRequestException(
        `Workflow ${alias} not found. Ensure it is registered as a provider in the module.`,
      );
    }
    return workflow;
  }

  async runStateless(
    params: {
      workspaceName: string;
      alias: string;
      userId: string;
      workspaceId: string;
      correlationId?: string;
      args?: Record<string, unknown>;
    },
    payload: RunPayload,
  ): Promise<WorkflowMetadataInterface> {
    const workflowConfig = this.resolveWorkflowByNames(params.alias);

    const ctx = new RunContext({
      root: params.alias,
      userId: params.userId,
      workspaceId: params.workspaceId,
      labels: [],
      payload,
      options: { stateless: true },
    });

    this.logger.debug(`Running stateless workflow: ${params.alias}`);

    return this.blockProcessor.processBlock(workflowConfig, params.args, ctx);
  }

  async runWorkflow(workflow: WorkflowEntity, payload: RunPayload): Promise<WorkflowMetadataInterface> {
    const workflowConfig = this.resolveWorkflowConfig(workflow);

    const ctx = new RunContext({
      root: workflow.alias,
      userId: workflow.createdBy,
      parentWorkflowId: workflow.id,
      workspaceId: workflow.workspaceId,
      labels: [...workflow.labels],
      payload,
      workflowContext: workflow.context,
      workspaceEnvironments: workflow.workspace?.environments
        ? WorkspaceEnvironmentContextDto.fromEntities(workflow.workspace.environments)
        : undefined,
      workflowEntity: workflow,
      options: { stateless: false },
    });

    await this.workflowService.setWorkflowStatus(workflow, WorkflowState.Running);

    this.logger.debug(`Running Root Workflow: ${workflow.alias}`);

    const executionMeta = await this.blockProcessor.processBlock(workflowConfig, workflow.args, ctx);

    // Handle auto-retry re-queue
    if (executionMeta._retrySignal) {
      const { delayMs } = executionMeta._retrySignal;
      this.logger.log(`Scheduling auto-retry for workflow ${workflow.id} in ${delayMs}ms`);

      await this.taskSchedulerService.addTask({
        id: `auto_retry-${randomUUID()}`,
        workspaceId: workflow.workspaceId,
        task: {
          name: 'auto_retry',
          type: 'run_workflow',
          workflowId: workflow.id,
          payload: {},
          user: workflow.createdBy,
          schedule: { delay: delayMs },
        },
      } satisfies ScheduledTask);

      return executionMeta;
    }

    // Status is already saved by WorkflowProcessorService.saveExecutionState().
    // Use the metadata status directly for the completion check.
    const status = executionMeta.status;

    // Trigger parent callback if this is a sub-workflow that completed
    if (status === WorkflowState.Completed) {
      workflow.status = status;
      workflow.result = executionMeta.result ?? null;
      await this.orchestrator.complete(workflow);
    }

    return executionMeta;
  }
}
