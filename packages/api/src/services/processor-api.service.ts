import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { TaskSchedulerService } from '@loopstack/core';
import { RunPipelinePayloadDto } from '../dtos/run-pipeline-payload.dto';

@Injectable()
export class ProcessorApiService {
  constructor(private taskSchedulerService: TaskSchedulerService) {}

  async processPipeline(pipelineId: string, user: string, payload: RunPipelinePayloadDto): Promise<any> {
    return this.taskSchedulerService.addTask({
      id: 'manual_pipeline_execution-' + randomUUID(),
      task: {
        name: 'manual_execution',
        type: 'run_pipeline',
        pipelineId,
        payload: {
          ...payload,
        },
        user: user,
      },
    } satisfies ScheduledTask);
  }
}
