import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PipelineEntity,
  PipelineState,
  RunContext,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockWorkflow,
} from '@loopstack/common';
import { RunPayload } from '@loopstack/contracts/schemas';
import { type PipelineEventPayload, PipelineService } from '../../persistence';
import { BlockDiscoveryService } from './block-discovery.service';
import { BlockProcessor } from './block-processor.service';
import { NamespaceProcessorService } from './namespace-processor.service';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private readonly pipelineService: PipelineService,
    private readonly namespaceProcessorService: NamespaceProcessorService,
    private readonly blockProcessor: BlockProcessor,
    private readonly blockDiscoveryService: BlockDiscoveryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private resolveWorkflow(workspaceName: string, blockName: string) {
    const workspaceInstance = this.blockDiscoveryService.getWorkspace(workspaceName);
    if (!workspaceInstance) {
      throw new BadRequestException(`Config for workspace with name ${workspaceName} not found.`);
    }

    const workflow = getBlockWorkflow<WorkflowInterface>(workspaceInstance, blockName);
    if (!workflow) {
      throw new Error(`Workflow ${blockName} not available in workspace ${workspaceName}`);
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
    const workflow = this.resolveWorkflow(params.workspaceName, params.blockName);

    const ctx = new RunContext({
      root: params.blockName,
      index: '0001',
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
    const workflow = this.resolveWorkflow(pipeline.workspace.blockName, pipeline.blockName);

    const namespace = await this.namespaceProcessorService.createRootNamespace(pipeline);

    const ctx = new RunContext({
      root: pipeline.blockName,
      index: pipeline.index,
      userId: pipeline.createdBy,
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      labels: [...pipeline.labels, namespace.name],
      namespace,
      payload,
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
