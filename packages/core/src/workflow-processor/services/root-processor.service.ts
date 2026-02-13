import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  InjectedWorkflowOptions,
  PipelineEntity,
  PipelineState,
  RunContext,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockWorkflow,
  getWorkflowOptions,
} from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
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

  private async processRootPipeline(
    workflow: WorkflowInterface,
    pipeline: PipelineEntity,
    payload: RunPayload,
    args: any,
    options: InjectedWorkflowOptions,
  ): Promise<WorkflowMetadataInterface> {
    const namespace = await this.namespaceProcessorService.createRootNamespace(pipeline);

    this.logger.debug(`Running Root Pipeline: ${pipeline.blockName}`);

    const ctx = new RunContext({
      root: pipeline.blockName,
      index: pipeline.index,
      userId: pipeline.createdBy,
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      payload,
      options,
    });

    return this.blockProcessor.processBlock(workflow, args, ctx);
  }

  async runPipeline(pipeline: PipelineEntity, payload: RunPayload): Promise<WorkflowMetadataInterface> {
    const workspaceInstance = this.blockDiscoveryService.getWorkspace(pipeline.workspace.blockName);
    if (!workspaceInstance) {
      throw new BadRequestException(`Config for workspace with name ${pipeline.workspace.blockName} not found.`);
    }

    const workflow = getBlockWorkflow<WorkflowInterface>(workspaceInstance, pipeline.blockName);
    if (!workflow) {
      throw new Error(`Workflow ${pipeline.blockName} not available in workspace ${pipeline.blockName}`);
    }

    const options = getWorkflowOptions(workspaceInstance, pipeline.blockName);

    await this.pipelineService.setPipelineStatus(pipeline, PipelineState.Running);

    const executionMeta = await this.processRootPipeline(workflow, pipeline, payload, pipeline.args, options);

    const status = executionMeta.hasError
      ? PipelineState.Failed
      : executionMeta.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);

    if (executionMeta.status === WorkflowState.Completed) {
      this.logger.log(`Root pipeline execution completed.`);

      this.eventEmitter.emit('pipeline.event', {
        pipelineId: pipeline.id,
        eventName: 'completed',
        workspaceId: pipeline.workspaceId,
        data: executionMeta.result,
      } satisfies PipelineEventPayload);
    }

    return executionMeta;
  }
}
