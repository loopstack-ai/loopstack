import { Injectable, Logger } from '@nestjs/common';
import { PipelineEntity, PipelineState } from '@loopstack/common';
import { WorkflowBase, WorkspaceBase } from '../abstract';
import { BlockExecutionContextDto, BlockStateDto } from '../../common';
import { NamespaceProcessorService } from './namespace-processor.service';
import { PipelineService } from '../../persistence';
import { WorkflowExecution } from '../interfaces/workflow-execution.interface';
import { BlockRegistryService } from './block-registry.service';
import { BlockProcessor } from './block-processor.service';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private pipelineService: PipelineService,
    private readonly namespaceProcessorService: NamespaceProcessorService,
    private readonly blockRegistryService: BlockRegistryService,
    private readonly blockProcessor: BlockProcessor,
  ) {}

  private async processRootPipeline(
    workflow: WorkflowBase,
    pipeline: PipelineEntity,
    payload: any,
    args?: any,
  ): Promise<WorkflowExecution> {
    const namespace =
      await this.namespaceProcessorService.createRootNamespace(pipeline);

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
      })
    });

    return this.blockProcessor.processBlock(workflow, args, ctx);
  }

  async runPipeline(
    pipeline: PipelineEntity,
    payload: any,
  ): Promise<WorkflowExecution> {

    const workspaceRegistry = this.blockRegistryService.getBlock(pipeline.workspace.blockName);
    if (!workspaceRegistry) {
      throw new Error(`Config for workspace ${pipeline.workspace.blockName} not found.`);
    }

    const workspace: WorkspaceBase = workspaceRegistry.provider.instance;
    const workflow = workspace.getWorkflow(pipeline.blockName);
    if (!workflow) {
      throw new Error(`Workflow ${pipeline.blockName} not available in workspace ${pipeline.blockName}`);
    }

    await this.pipelineService.setPipelineStatus(
      pipeline,
      PipelineState.Running,
    );

    const ctx = await this.processRootPipeline(
      workflow,
      pipeline,
      payload,
      pipeline.args,
    );

    const status = ctx.runtime.error
      ? PipelineState.Failed
      : ctx.runtime.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);

    return ctx;
  }
}
