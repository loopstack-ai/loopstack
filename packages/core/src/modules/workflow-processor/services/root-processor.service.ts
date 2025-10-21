import { Injectable, Logger } from '@nestjs/common';
import {
  PipelineEntity,
  PipelineState,
} from '@loopstack/shared';
import {
  NamespacesService,
  PipelineService,
} from '../../persistence';
import { Workspace } from '../abstract';
import { BlockRegistryService } from './block-registry.service';
import { BlockProcessor } from './block-processor.service';
import { ProcessorFactory } from './processor.factory';
import { BlockFactory } from './block.factory';
import { WorkspaceExecutionContextDto } from '../dtos/block-execution-context.dto';
import { BlockStateDto } from '../dtos/workflow-state.dto';

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
  ): Promise<Workspace> {
    const namespace =
      await this.namespacesService.createRootNamespace(pipeline);

    this.logger.debug(`Running Root Pipeline: ${pipeline.configKey}`);

    const blockRegistryItem = this.blockRegistryService.getBlock(pipeline.workspace.configKey);
    if (!blockRegistryItem) {
      throw new Error(`Config for workspace ${pipeline.workspace.configKey} not found.`)
    }

    const ctx = new WorkspaceExecutionContextDto({
      root: pipeline.configKey,
      index: pipeline.index,
      userId: pipeline.createdBy,
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      payload: payload,
    });

    const block = await this.blockFactory.createBlock<Workspace, WorkspaceExecutionContextDto>(pipeline.workspace.configKey, args, ctx);
    return this.blockProcessor.processBlock<Workspace>(block, this.processorFactory);
  }

  async runPipeline(
    pipeline: PipelineEntity,
    payload: any,
    args?: any,
  ): Promise<Workspace> {
    await this.pipelineService.setPipelineStatus(
      pipeline,
      PipelineState.Running,
    );
    const block = await this.processRootPipeline(pipeline, payload, args);

    const status = block.state?.error
      ? PipelineState.Failed
      : block.state?.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);

    return block;
  }
}
