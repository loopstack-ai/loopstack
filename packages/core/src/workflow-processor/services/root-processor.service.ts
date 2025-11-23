import { Injectable, Logger } from '@nestjs/common';
import { PipelineEntity, PipelineState } from '@loopstack/shared';
import { Workspace } from '../abstract';
import { BlockRegistryService } from './block-registry.service';
import { BlockProcessor } from './block-processor.service';
import { ProcessorFactory } from './processor.factory';
import { BlockFactory } from './block.factory';
import { RootExecutionContextDto } from '../dtos';
import { NamespacesService, PipelineService } from '../../persistence';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private pipelineService: PipelineService,
    private namespacesService: NamespacesService,
    private blockRegistryService: BlockRegistryService,
    private readonly blockProcessor: BlockProcessor,
    private readonly blockFactory: BlockFactory,
    private readonly processorFactory: ProcessorFactory,
  ) {}

  private async processRootPipeline(
    pipeline: PipelineEntity,
    payload: any,
    args?: any,
  ): Promise<any> {
    const namespace =
      await this.namespacesService.createRootNamespace(pipeline);

    this.logger.debug(`Running Root Pipeline: ${pipeline.configKey}`);

    const blockRegistryItem = this.blockRegistryService.getBlock(
      pipeline.configKey,
    );
    if (!blockRegistryItem) {
      throw new Error(
        `Config for pipeline ${pipeline.configKey} not found.`,
      );
    }

    const ctx = new RootExecutionContextDto({
      root: pipeline.configKey,
      index: pipeline.index,
      userId: pipeline.createdBy,
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      payload: payload,
    });

    const block = await this.blockFactory.createBlock(pipeline.configKey, args, ctx);

    return this.blockProcessor.processBlock(
      block,
      this.processorFactory,
    );
  }

  async runPipeline(
    pipeline: PipelineEntity,
    payload: any,
  ): Promise<Workspace> {
    await this.pipelineService.setPipelineStatus(
      pipeline,
      PipelineState.Running,
    );

    const block = await this.processRootPipeline(pipeline, payload, pipeline.args);

    const status = block.state?.error
      ? PipelineState.Failed
      : block.state?.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);

    return block;
  }
}
