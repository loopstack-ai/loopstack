import { Body, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ScheduledTask } from '@loopstack/shared';
import { ConfigService } from '@nestjs/config';
import { WorkspaceService } from '../../persistence';
import { CreatePipelineService } from '../../workflow-processor';
import { TaskSchedulerService } from './task-scheduler.service';

@Injectable()
export class RunService {
  constructor(
    private readonly configService: ConfigService,
    private readonly createPipelineService: CreatePipelineService,
    private readonly workspaceService: WorkspaceService,
    private readonly taskSchedulerService: TaskSchedulerService,
  ) {

  }

  async run(
    itemName: string,
    workspaceName: string,
    payload: any = {},
    userId: string,
    options: {
      workspaceTitle?: string;
    } = {},
  ): Promise<{
    workerId: string;
    pipelineId: string;
    workspaceId: string;
  }> {

    const workerId = this.configService.get('auth.clientId');

    let workspace = await this.workspaceService.getWorkspace({
      configKey: workspaceName,
    }, userId);

    if (!workspace) {
      workspace = await this.workspaceService.create({
        configKey: workspaceName,
        title: options.workspaceTitle || workspaceName,
      }, userId);
    }

    const pipeline = await this.createPipelineService.create({
      id: workspace.id,
    }, {
      configKey: itemName,
      args: payload
    }, userId);

    await this.taskSchedulerService.addTask({
      id: 'manual_pipeline_execution-' + randomUUID(),
      task: {
        name: 'manual_execution',
        type: 'run_pipeline',
        payload: {
          id: pipeline.id,
        },
        user: userId
      },
    } satisfies ScheduledTask);

    return {
      workerId,
      workspaceId: workspace.id,
      pipelineId: pipeline.id,
    }
  }
}