import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../../common';
import { PipelineEntity } from '@loopstack/shared';
import { NamespacesService } from '../../persistence';
import { PipelineProcessorService } from './pipeline-processor.service';

@Injectable()
export class RootProcessorService {
  private readonly logger = new Logger(RootProcessorService.name);
  constructor(
    private contextService: ContextService,
    private processorService: PipelineProcessorService,
    private namespacesService: NamespacesService,
  ) {}

  async processRootPipeline(pipeline: PipelineEntity, payload: any) {
    const namespace =
      await this.namespacesService.createRootNamespace(pipeline);
    const context = this.contextService.createRootContext(pipeline, {
      labels: [...pipeline.labels, namespace.name],
      namespace: namespace,
      transition: payload.transition,
      stop: false,
    });

    return this.processorService.processPipelineItem(
      {
        pipeline: pipeline.model,
      },
      context,
    );
  }
}
