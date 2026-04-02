import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RunContext,
  WorkflowEntity,
  WorkflowInterface,
  WorkflowMetadataInterface,
  WorkflowState,
  WorkspaceEnvironmentContextDto,
  getBlockWorkflow,
} from '@loopstack/common';
import { RunPayload } from '@loopstack/contracts/schemas';
import { type WorkflowEventPayload, WorkflowService } from '../../persistence';
import { BlockDiscoveryService } from './block-discovery.service';
import { BlockProcessor } from './block-processor.service';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly blockProcessor: BlockProcessor,
    private readonly blockDiscoveryService: BlockDiscoveryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private resolveWorkflowFromWorkspace(workspaceName: string, blockName: string): WorkflowInterface | undefined {
    const workspaceInstance = this.blockDiscoveryService.getWorkspace(workspaceName);
    if (!workspaceInstance) {
      return undefined;
    }
    return getBlockWorkflow<WorkflowInterface>(workspaceInstance, blockName);
  }

  private async resolveWorkflowConfig(workflow: WorkflowEntity): Promise<WorkflowInterface> {
    // blockName is the property name — resolve through hierarchy for security validation
    if (workflow.parentId && !workflow.parent) {
      workflow.parent = await this.workflowService.getWorkflow(workflow.parentId, workflow.createdBy, [
        'workspace',
        'parent',
      ]);
    }

    // Try parent workflow first (for sub-workflows)
    if (workflow.parent) {
      const parentWorkflowConfig = await this.resolveWorkflowConfig(workflow.parent);
      const subWorkflow = getBlockWorkflow<WorkflowInterface>(parentWorkflowConfig, workflow.blockName);
      if (subWorkflow) {
        return subWorkflow;
      }
    }

    // Fallback: resolve from workspace
    const workflowConfig = this.resolveWorkflowFromWorkspace(workflow.workspace.blockName, workflow.blockName);
    if (!workflowConfig) {
      throw new Error(
        `Workflow ${workflow.blockName} not found` +
          (workflow.parent ? ` on parent workflow or` : ' on') +
          ` workspace ${workflow.workspace.blockName}`,
      );
    }

    return workflowConfig;
  }

  private resolveWorkflowByNames(workspaceName: string, blockName: string): WorkflowInterface {
    const workflow = this.resolveWorkflowFromWorkspace(workspaceName, blockName);
    if (!workflow) {
      throw new BadRequestException(`Workflow ${blockName} not available in workspace ${workspaceName}`);
    }
    return workflow;
  }

  private emitCompletionEvent(payload: WorkflowEventPayload): void {
    this.logger.log(`Root workflow execution completed.`);
    this.eventEmitter.emit('workflow.event', payload);
  }

  async runStateless(
    params: {
      workspaceName: string;
      blockName: string;
      userId: string;
      workspaceId: string;
      correlationId?: string;
      args?: Record<string, unknown>;
    },
    payload: RunPayload,
  ): Promise<WorkflowMetadataInterface> {
    const workflowConfig = this.resolveWorkflowByNames(params.workspaceName, params.blockName);

    const ctx = new RunContext({
      root: params.blockName,
      userId: params.userId,
      workspaceId: params.workspaceId,
      labels: [],
      payload,
      options: { stateless: true },
    });

    this.logger.debug(`Running stateless workflow: ${params.blockName}`);

    const executionMeta = await this.blockProcessor.processBlock(workflowConfig, params.args, ctx);

    if (params.correlationId) {
      this.emitCompletionEvent({
        correlationId: params.correlationId,
        eventName: `workflow.${executionMeta.status}`,
        workspaceId: params.workspaceId,
        data: {
          workflowId: undefined,
          status: executionMeta.status,
          result: executionMeta.result ?? null,
        },
      });
    }

    return executionMeta;
  }

  async runWorkflow(workflow: WorkflowEntity, payload: RunPayload): Promise<WorkflowMetadataInterface> {
    const workflowConfig = await this.resolveWorkflowConfig(workflow);

    const ctx = new RunContext({
      root: workflow.blockName,
      userId: workflow.createdBy,
      parentWorkflowId: workflow.id,
      workspaceId: workflow.workspaceId,
      labels: [...workflow.labels],
      payload,
      workflowContext: workflow.context,
      workspaceEnvironments: workflow.workspace?.environments
        ? WorkspaceEnvironmentContextDto.fromEntities(workflow.workspace.environments)
        : undefined,
      options: { stateless: false },
    });

    await this.workflowService.setWorkflowStatus(workflow, WorkflowState.Running);

    this.logger.debug(`Running Root Workflow: ${workflow.blockName}`);

    const executionMeta = await this.blockProcessor.processBlock(workflowConfig, workflow.args, ctx);

    const status = executionMeta.hasError
      ? WorkflowState.Failed
      : executionMeta.stop
        ? WorkflowState.Paused
        : WorkflowState.Completed;

    await this.workflowService.setWorkflowStatus(workflow, status);

    if (workflow.eventCorrelationId) {
      this.emitCompletionEvent({
        correlationId: workflow.eventCorrelationId,
        eventName: `workflow.${executionMeta.status}`,
        workspaceId: workflow.workspaceId,
        data: {
          workflowId: workflow.id,
          status: executionMeta.status,
          result: executionMeta.result ?? null,
        },
      });
    }

    return executionMeta;
  }
}
