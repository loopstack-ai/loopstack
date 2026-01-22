import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowState } from '@loopstack/common';
import type { RunPipelineTask } from '@loopstack/contracts/types';
import { PipelineService } from '../../../persistence';
import type { PipelineEventPayload } from '../../../persistence/services/event-subscriber.service';
import { RootProcessorService } from '../../../workflow-processor';

@Injectable()
export class RunPipelineTaskProcessorService {
  private readonly logger = new Logger(RunPipelineTaskProcessorService.name);

  constructor(
    private readonly pipelineService: PipelineService,
    private readonly rootProcessorService: RootProcessorService,
    private readonly eventEmitter: EventEmitter2,
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

    this.logger.debug(`Pipeline for schedule task created with id ${pipeline.id}`);

    const resultCtx = await this.rootProcessorService.runPipeline(pipeline, task.payload);
    if (resultCtx.entity.status === WorkflowState.Completed) {
      this.logger.log(`Root pipeline execution completed.`);

      this.eventEmitter.emit('pipeline.event', {
        eventPipelineId: pipeline.id,
        eventName: 'completed',
        workspaceId: pipeline.workspaceId,
        data: resultCtx.entity.result,
      } satisfies PipelineEventPayload);
    }
  }
}
