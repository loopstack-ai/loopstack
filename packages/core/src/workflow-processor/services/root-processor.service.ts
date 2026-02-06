import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  BlockExecutionContextDto,
  BlockStateDto,
  PipelineEntity,
  PipelineState,
  WorkflowExecution,
  WorkflowInterface,
  getBlockWorkflow,
} from '@loopstack/common';
import { PipelineService } from '../../persistence';
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
  ) {}

  private async processRootPipeline(
    workflow: WorkflowInterface,
    pipeline: PipelineEntity,
    payload: BlockExecutionContextDto['payload'],
    args?: any,
  ): Promise<WorkflowExecution> {
    const namespace = await this.namespaceProcessorService.createRootNamespace(pipeline);

    this.logger.debug(`Running Root Pipeline: ${pipeline.blockName}`);

    const ctx = new BlockExecutionContextDto<BlockStateDto>({
      root: pipeline.blockName,
      index: pipeline.index,
      userId: pipeline.createdBy,
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      payload: payload,
      state: new BlockStateDto({
        id: pipeline.blockName,
        error: false,
        stop: false,
      }),
    });

    return this.blockProcessor.processBlock(workflow, args, ctx);
  }

  async runPipeline(
    pipeline: PipelineEntity,
    payload: BlockExecutionContextDto['payload'],
  ): Promise<WorkflowExecution> {
    const workspaceInstance = this.blockDiscoveryService.getWorkspace(pipeline.workspace.blockName);
    if (!workspaceInstance) {
      throw new BadRequestException(`Config for workspace with name ${pipeline.workspace.blockName} not found.`);
    }

    const workflow = getBlockWorkflow<WorkflowInterface>(workspaceInstance, pipeline.blockName);
    if (!workflow) {
      throw new Error(`Workflow ${pipeline.blockName} not available in workspace ${pipeline.blockName}`);
    }

    await this.pipelineService.setPipelineStatus(pipeline, PipelineState.Running);

    const ctx = await this.processRootPipeline(workflow, pipeline, payload, pipeline.args);

    const status = ctx.runtime.error
      ? PipelineState.Failed
      : ctx.runtime.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);

    return ctx;
  }
}
