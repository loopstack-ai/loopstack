import { Injectable, Logger } from '@nestjs/common';
import type { RunPipelineTask } from '@loopstack/contracts/types';
import { PipelineService, RootProcessorService } from '../../../workflow-processor';

@Injectable()
export class RunPipelineTaskProcessorService {
  private readonly logger = new Logger(RunPipelineTaskProcessorService.name);

  constructor(
    private readonly pipelineService: PipelineService,
    private readonly rootProcessorService: RootProcessorService,
  ) {}

  public async process(task: RunPipelineTask) {
    const pipeline = await this.pipelineService.getPipeline(
      task.payload.id,
      task.user,
      ['workspace'], // todo: processing fails when loading namespaces relation. why?
    );

    if (!pipeline) {
      throw new Error(`Pipeline with id ${task.payload.id} not found.`);
    }

    this.logger.debug(
      `Pipeline for schedule task created with id ${pipeline.id}`,
    );

    await this.rootProcessorService.runPipeline(pipeline, task.payload);
  }
}
