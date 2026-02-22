import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { TaskSchedulerService } from '@loopstack/core';
import { RunPipelinePayloadDto } from '../dtos/run-pipeline-payload.dto';
import { PipelineApiService } from './pipeline-api.service';

@Injectable()
export class ProcessorApiService {
  constructor(
    private taskSchedulerService: TaskSchedulerService,
    private pipelineApiService: PipelineApiService,
  ) {}

  async processPipeline(pipelineId: string, user: string, payload: RunPipelinePayloadDto): Promise<any> {
    const pipeline = await this.pipelineApiService.findOneById(pipelineId, user);

    return this.taskSchedulerService.addTask({
      id: 'manual_pipeline_execution-' + randomUUID(),
      workspaceId: pipeline.workspaceId,
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
