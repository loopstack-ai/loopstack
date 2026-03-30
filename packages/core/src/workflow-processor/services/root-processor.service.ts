import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PipelineEntity,
  PipelineState,
  RunContext,
  WorkflowInterface,
  WorkflowMetadataInterface,
  WorkspaceEnvironmentContextDto,
  getBlockWorkflow,
} from '@loopstack/common';
import { RunPayload } from '@loopstack/contracts/schemas';
import { type PipelineEventPayload, PipelineService } from '../../persistence';
import { BlockDiscoveryService } from './block-discovery.service';
import { BlockProcessor } from './block-processor.service';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private readonly pipelineService: PipelineService,
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

  private async resolveWorkflow(pipeline: PipelineEntity): Promise<WorkflowInterface> {
    // When recursing, the parent relation may not be eagerly loaded beyond the first level.
    // Load it on demand when parentId exists but the relation object is missing.
    if (pipeline.parentId && !pipeline.parent) {
      pipeline.parent = await this.pipelineService.getPipeline(pipeline.parentId, pipeline.createdBy, [
        'workspace',
        'parent',
      ]);
    }

    // Try parent workflow first (for sub-pipelines)
    if (pipeline.parent) {
      const parentWorkflow = await this.resolveWorkflow(pipeline.parent);
      const subWorkflow = getBlockWorkflow<WorkflowInterface>(parentWorkflow, pipeline.blockName);
      if (subWorkflow) {
        return subWorkflow;
      }
    }

    // Fallback: resolve from workspace
    const workflow = this.resolveWorkflowFromWorkspace(pipeline.workspace.blockName, pipeline.blockName);
    if (!workflow) {
      throw new Error(
        `Workflow ${pipeline.blockName} not found` +
          (pipeline.parent ? ` on parent workflow or` : ' on') +
          ` workspace ${pipeline.workspace.blockName}`,
      );
    }

    return workflow;
  }

  private resolveWorkflowByNames(workspaceName: string, blockName: string): WorkflowInterface {
    const workflow = this.resolveWorkflowFromWorkspace(workspaceName, blockName);
    if (!workflow) {
      throw new BadRequestException(`Workflow ${blockName} not available in workspace ${workspaceName}`);
    }
    return workflow;
  }

  private emitCompletionEvent(payload: PipelineEventPayload): void {
    this.logger.log(`Root pipeline execution completed.`);
    this.eventEmitter.emit('pipeline.event', payload);
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
    const workflow = this.resolveWorkflowByNames(params.workspaceName, params.blockName);

    const ctx = new RunContext({
      root: params.blockName,
      userId: params.userId,
      workspaceId: params.workspaceId,
      labels: [],
      payload,
      options: { stateless: true },
    });

    this.logger.debug(`Running stateless workflow: ${params.blockName}`);

    const executionMeta = await this.blockProcessor.processBlock(workflow, params.args, ctx);

    if (params.correlationId) {
      this.emitCompletionEvent({
        correlationId: params.correlationId,
        eventName: `workflow.${executionMeta.status}`,
        workspaceId: params.workspaceId,
        data: {
          pipelineId: undefined,
          status: executionMeta.status,
          result: executionMeta.result ?? null,
        },
      });
    }

    return executionMeta;
  }

  async runPipeline(pipeline: PipelineEntity, payload: RunPayload): Promise<WorkflowMetadataInterface> {
    const workflow = await this.resolveWorkflow(pipeline);

    const ctx = new RunContext({
      root: pipeline.blockName,
      userId: pipeline.createdBy,
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      labels: [...pipeline.labels],
      payload,
      pipelineContext: pipeline.context,
      workspaceEnvironments: pipeline.workspace?.environments
        ? WorkspaceEnvironmentContextDto.fromEntities(pipeline.workspace.environments)
        : undefined,
      options: { stateless: false },
    });

    await this.pipelineService.setPipelineStatus(pipeline, PipelineState.Running);

    this.logger.debug(`Running Root Pipeline: ${pipeline.blockName}`);

    const executionMeta = await this.blockProcessor.processBlock(workflow, pipeline.args, ctx);

    const status = executionMeta.hasError
      ? PipelineState.Failed
      : executionMeta.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);

    if (pipeline.eventCorrelationId) {
      this.emitCompletionEvent({
        correlationId: pipeline.eventCorrelationId,
        eventName: `workflow.${executionMeta.status}`,
        workspaceId: pipeline.workspaceId,
        data: {
          pipelineId: pipeline.id,
          status: executionMeta.status,
          result: executionMeta.result ?? null,
        },
      });
    }

    return executionMeta;
  }
}
