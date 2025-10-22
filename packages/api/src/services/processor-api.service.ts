import {
  Injectable,
} from '@nestjs/common';
import { RunPipelinePayloadDto } from '../dtos/run-pipeline-payload.dto';
import {
  ScheduledTask,
} from '@loopstack/shared';
import { randomUUID } from 'node:crypto';
import { TaskSchedulerService } from '@loopstack/core';

@Injectable()
export class ProcessorApiService {
  constructor(
    private taskSchedulerService: TaskSchedulerService,
  ) {}

  async processPipeline(
    pipelineId: string,
    user: string | null,
    payload: RunPipelinePayloadDto,
  ): Promise<any> {
    return this.taskSchedulerService.addTask({
      id: 'manual_pipeline_execution-' + randomUUID(),
      task: {
        name: 'manual_execution',
        type: 'run_pipeline',
        payload: {
          ...payload,
          id: pipelineId,
        },
        user: user
      },
    } satisfies ScheduledTask);
  }
}
