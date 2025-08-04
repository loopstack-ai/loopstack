import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../../common';
import {
  ContextInterface,
  PipelineEntity,
  PipelineState,
} from '@loopstack/shared';
import {
  NamespacesService,
  PipelineService,
} from '../../persistence';
import { PipelineProcessorService } from './pipeline-processor.service';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);

  constructor(
    private contextService: ContextService,
    private pipelineService: PipelineService,
    private processorService: PipelineProcessorService,
    private namespacesService: NamespacesService,
  ) {}

  private async processRootPipeline(
    pipeline: PipelineEntity,
    payload: any,
    variables?: Record<string, any>,
  ): Promise<ContextInterface> {
    const namespace =
      await this.namespacesService.createRootNamespace(pipeline);

    const context = this.contextService.createRootContext(pipeline, {
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      transition: payload.transition,
      stop: false,
      error: false,
      variables: variables ?? {},
    });

    this.logger.debug(`Running Root Pipeline: ${pipeline.configKey}`);

    return this.processorService.processPipelineItem(
      {
        pipeline: pipeline.configKey,
      },
      context,
    );
  }

  async runPipeline(
    pipeline: PipelineEntity,
    payload: any,
    variables?: Record<string, any>,
  ): Promise<ContextInterface> {
    await this.pipelineService.setPipelineStatus(
      pipeline,
      PipelineState.Running,
    );
    const context = await this.processRootPipeline(pipeline, payload, variables);

    const status = context.error
      ? PipelineState.Failed
      : context.stop
        ? PipelineState.Paused
        : PipelineState.Completed;

    await this.pipelineService.setPipelineStatus(pipeline, status);

    return context;
  }
}
