import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  RunContext,
  WorkflowEntity,
  WorkflowInterface,
  WorkflowMetadataInterface,
  WorkflowOrchestrator,
  WorkflowState,
  WorkspaceEnvironmentContextDto,
  getBlockWorkflow,
} from '@loopstack/common';
import { WORKFLOW_ORCHESTRATOR } from '@loopstack/common';
import { RunPayload } from '@loopstack/contracts/schemas';
import { WorkflowService } from '../../persistence';
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
  ) {}

  private resolveWorkflowFromWorkspace(workspaceName: string, alias: string): WorkflowInterface | undefined {
    const workspaceInstance = this.blockDiscoveryService.getWorkspace(workspaceName);
    if (!workspaceInstance) {
      return undefined;
    }
    return getBlockWorkflow<WorkflowInterface>(workspaceInstance, alias);
  }

  private async resolveWorkflowConfig(workflow: WorkflowEntity): Promise<WorkflowInterface> {
    // alias is the property name — resolve through hierarchy for security validation
    if (workflow.parentId && !workflow.parent) {
      workflow.parent = await this.workflowService.getWorkflow(workflow.parentId, workflow.createdBy, [
        'workspace',
        'parent',
      ]);
    }

    // Try parent workflow first (for sub-workflows)
    if (workflow.parent) {
      const parentWorkflowConfig = await this.resolveWorkflowConfig(workflow.parent);
      const subWorkflow = getBlockWorkflow<WorkflowInterface>(parentWorkflowConfig, workflow.alias);
      if (subWorkflow) {
        return subWorkflow;
      }
    }

    // Fallback: resolve from workspace
    const workflowConfig = this.resolveWorkflowFromWorkspace(workflow.workspace.className!, workflow.alias);
    if (!workflowConfig) {
      throw new Error(
        `Workflow ${workflow.alias} not found` +
          (workflow.parent ? ` on parent workflow or` : ' on') +
          ` workspace ${workflow.workspace.className!}`,
      );
    }

    return workflowConfig;
  }

  private resolveWorkflowByNames(workspaceName: string, alias: string): WorkflowInterface {
    const workflow = this.resolveWorkflowFromWorkspace(workspaceName, alias);
    if (!workflow) {
      throw new BadRequestException(`Workflow ${alias} not available in workspace ${workspaceName}`);
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
    const workflowConfig = this.resolveWorkflowByNames(params.workspaceName, params.alias);

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
    const workflowConfig = await this.resolveWorkflowConfig(workflow);

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
