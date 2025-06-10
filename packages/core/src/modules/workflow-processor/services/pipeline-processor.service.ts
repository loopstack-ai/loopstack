import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from '../../configuration';
import { NamespacesService, PipelineService } from '../../persistence';
import { WorkflowProcessorService } from './workflow-processor.service';
import { ContextService } from '../../common';
import {
  ContextInterface,
  ProcessRunInterface,
  PipelineType,
} from '@loopstack/shared';

@Injectable()
export class PipelineProcessorService {
  private readonly logger = new Logger(PipelineProcessorService.name);
  constructor(
    private loopConfigService: ConfigurationService,
    private pipelineService: PipelineService,
    private workflowProcessorService: WorkflowProcessorService,
    private namespacesService: NamespacesService,
    private contextService: ContextService,
  ) {}

  async processPipeline(
    payload: ProcessRunInterface,
  ): Promise<ContextInterface> {
    this.logger.debug(`Processing pipeline: ${payload.pipelineId}`);

    const pipeline = await this.pipelineService.getPipeline(
      payload.pipelineId,
      payload.userId,
    );
    if (!pipeline) {
      throw new Error(`pipeline "${payload.pipelineId}" not found.`);
    }

    const pipelineConfig = this.loopConfigService.get<PipelineType>(
      'pipelines',
      pipeline.model,
    );
    if (!pipelineConfig) {
      throw new Error(`pipeline model "${pipeline.model}" not found.`);
    }

    const namespace = await this.namespacesService.createRootNamespace(pipeline);
    const context = this.contextService.createRootContext(pipeline, {
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      transition: payload.transition,
    });

    return this.workflowProcessorService.start(
      pipelineConfig.entrypoint,
      context,
    );
  }
}
