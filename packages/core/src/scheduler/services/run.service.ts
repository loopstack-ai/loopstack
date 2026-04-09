import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { WorkspaceService } from '../../persistence';
import { CreateWorkflowService } from '../../workflow-processor';
import { TaskSchedulerService } from './task-scheduler.service';

@Injectable()
export class RunService {
  constructor(
    private readonly configService: ConfigService,
    private readonly createWorkflowService: CreateWorkflowService,
    private readonly workspaceService: WorkspaceService,
    private readonly taskSchedulerService: TaskSchedulerService,
  ) {}

  async run(
    itemName: string,
    workspaceName: string,
    payload: unknown = {},
    userId: string,
    options: {
      workspaceTitle?: string;
    } = {},
  ): Promise<{
    workerId: string;
    workflowId: string;
    workspaceId: string;
  }> {
    const workerId = this.configService.getOrThrow<string>('auth.clientId');

    let workspace = await this.workspaceService.getWorkspace(
      {
        className: workspaceName,
      },
      userId,
    );

    if (!workspace) {
      workspace = await this.workspaceService.create(
        {
          className: workspaceName,
          title: options.workspaceTitle || workspaceName,
        },
        userId,
      );
    }

    const workflow = await this.createWorkflowService.create(
      {
        id: workspace.id,
      },
      {
        alias: itemName,
        args: payload,
      },
      userId,
    );

    await this.taskSchedulerService.addTask({
      id: 'manual_workflow_execution-' + randomUUID(),
      workspaceId: workspace.id,
      task: {
        name: 'manual_execution',
        type: 'run_workflow',
        workflowId: workflow.id,
        payload: {},
        user: userId,
      },
    } satisfies ScheduledTask);

    return {
      workerId,
      workspaceId: workspace.id,
      workflowId: workflow.id,
    };
  }
}
