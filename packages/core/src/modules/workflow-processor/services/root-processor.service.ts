import { Injectable, Logger } from '@nestjs/common';
import {
  PipelineEntity,
  PipelineState,
} from '@loopstack/shared';
import {
  NamespacesService,
  PipelineService,
} from '../../persistence';
import { PipelineProcessorService } from './pipeline-processor.service';
import { BlockRegistryService } from '../../configuration';
import { Block } from '../abstract/block.abstract';
import { ServiceStateFactory } from './service-state-factory.service';
import { Workspace } from '../abstract';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private pipelineService: PipelineService,
    private processorService: PipelineProcessorService,
    private namespacesService: NamespacesService,
    private blockRegistryService: BlockRegistryService,
    private readonly serviceStateFactory: ServiceStateFactory,
  ) {}

  private async processRootPipeline(
    pipeline: PipelineEntity,
    payload: any,
    args?: any,
  ): Promise<Block> {
    const namespace =
      await this.namespacesService.createRootNamespace(pipeline);

    this.logger.debug(`Running Root Pipeline: ${pipeline.configKey}`);

    const blockRegistryItem = this.blockRegistryService.getBlock(pipeline.workspace.configKey);
    if (!blockRegistryItem) {
      throw new Error(`Config for workspace ${pipeline.workspace.configKey} not found.`)
    }
    const block = await this.serviceStateFactory.createBlockInstance<Workspace>(blockRegistryItem, {
      index: pipeline.index,
      userId: pipeline.createdBy,
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      payload: payload,
    });

    const parsedArgs = block.metadata.properties?.parse(args);
    block.initWorkspace(parsedArgs);

    return this.processorService.processPipelineItem(
      block,
      {
        id: 'root',
        block: pipeline.configKey,
      },
    );
  }

  async runPipeline(
    pipeline: PipelineEntity,
    payload: any,
    args?: any,
  ): Promise<Block> {
    await this.pipelineService.setPipelineStatus(
      pipeline,
      PipelineState.Running,
    );
    const block = await this.processRootPipeline(pipeline, payload, args);

    const status = block.state.error
      ? PipelineState.Failed
      : block.state.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);

    return block;
  }
}
