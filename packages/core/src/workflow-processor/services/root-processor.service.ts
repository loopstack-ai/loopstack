import { Injectable, Logger } from '@nestjs/common';
import { PipelineEntity, PipelineState } from '@loopstack/common';
import { Workspace } from '../abstract';
import { BlockRegistryService } from './block-registry.service';
import { BlockProcessor } from './block-processor.service';
import { ProcessorFactory } from './processor.factory';
import { BlockFactory } from './block.factory';
import { RootExecutionContextDto } from '../../common';
import { NamespaceProcessorService } from './namespace-processor.service';
import { PipelineService } from '../../persistence';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private pipelineService: PipelineService,
    private blockRegistryService: BlockRegistryService,
    private readonly blockProcessor: BlockProcessor,
    private readonly blockFactory: BlockFactory,
    private readonly processorFactory: ProcessorFactory,
    private readonly namespaceProcessorService: NamespaceProcessorService,
  ) {}

  private async processRootPipeline(
    pipeline: PipelineEntity,
    payload: any,
    args?: any,
  ): Promise<any> {
    const namespace =
      await this.namespaceProcessorService.createRootNamespace(pipeline);

    this.logger.debug(`Running Root Pipeline: ${pipeline.blockName}`);

    const blockRegistryItem = this.blockRegistryService.getBlock(
      pipeline.blockName,
    );
    if (!blockRegistryItem) {
      throw new Error(`Config for pipeline ${pipeline.blockName} not found.`);
    }

    const ctx = new RootExecutionContextDto({
      root: pipeline.blockName,
      index: pipeline.index,
      userId: pipeline.createdBy,
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      payload: payload,
    });

    const block = await this.blockFactory.createBlock(
      pipeline.blockName,
      args,
      ctx,
    );

    return this.blockProcessor.processBlock(block, this.processorFactory);
  }

  async runPipeline(
    pipeline: PipelineEntity,
    payload: any,
  ): Promise<Workspace> {
    await this.pipelineService.setPipelineStatus(
      pipeline,
      PipelineState.Running,
    );

    const block = await this.processRootPipeline(
      pipeline,
      payload,
      pipeline.args,
    );

    const status = block.state?.error
      ? PipelineState.Failed
      : block.state?.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);

    return block;
  }
}
