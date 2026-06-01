import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  RunContext,
  WORKFLOW_ORCHESTRATOR,
  WorkflowEntity,
  WorkflowInterface,
  WorkflowMetadataInterface,
  WorkflowOrchestrator,
} from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import { RunPayload } from '@loopstack/contracts/schemas';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { WorkflowService } from '../../persistence/services/workflow.service.js';
import { TaskSchedulerService } from '../../scheduler/services/task-scheduler.service.js';
import { BlockProcessor } from './block-processor.service.js';
import { WorkflowRegistryService } from './workflow-registry.service.js';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly blockProcessor: BlockProcessor,
    private readonly workflowRegistryService: WorkflowRegistryService,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    private readonly taskSchedulerService: TaskSchedulerService,
  ) {}

  private resolveWorkflowConfig(workflow: WorkflowEntity): WorkflowInterface {
    if (!workflow.className) {
      throw new Error(`Workflow entity ${workflow.id} has no className. Cannot resolve.`);
    }

    return this.workflowRegistryService.getByName(workflow.className);
  }

  private resolveWorkflowByNames(workflowName: string): WorkflowInterface {
    try {
      return this.workflowRegistryService.getByName(workflowName);
    } catch {
      throw new BadRequestException(
        `Workflow ${workflowName} not found. Ensure it is registered as a provider in the module.`,
      );
    }
  }

  async runStateless(
    params: {
      workflowName: string;
      userId: string;
      workspaceId: string;
      correlationId?: string;
      args?: Record<string, unknown>;
    },
    payload: RunPayload,
  ): Promise<WorkflowMetadataInterface> {
    const workflowConfig = this.resolveWorkflowByNames(params.workflowName);

    const ctx: RunContext = {
      root: params.workflowName,
      userId: params.userId,
      workspaceId: params.workspaceId,
      labels: [],
      payload,
      options: { stateless: true },
    };

    this.logger.debug(`Running stateless workflow: ${params.workflowName}`);

    return this.blockProcessor.processBlock(workflowConfig, params.args, ctx);
  }

  async runWorkflow(workflow: WorkflowEntity, payload: RunPayload): Promise<WorkflowMetadataInterface> {
    const workflowConfig = this.resolveWorkflowConfig(workflow);

    const ctx: RunContext = {
      root: workflow.workflowName,
      userId: workflow.createdBy,
      workflowId: workflow.id,
      workspaceId: workflow.workspaceId,
      labels: [...workflow.labels],
      payload,
      workflowContext: workflow.context,
      workflowEntity: workflow,
      options: { stateless: false },
    };

    await this.workflowService.setWorkflowStatus(workflow, WorkflowState.Running);

    this.logger.debug(`Running Root Workflow: ${workflow.workflowName}`);

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
    const status = executionMeta.status;

    // Trigger parent callback if this is a sub-workflow that completed, failed, or was canceled
    if (status === WorkflowState.Completed || status === WorkflowState.Failed || status === WorkflowState.Canceled) {
      workflow.status = status;
      workflow.result = executionMeta.result ?? null;
      await this.orchestrator.complete(workflow);
    }

    return executionMeta;
  }
}
