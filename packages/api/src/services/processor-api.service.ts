import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WorkflowState } from '@loopstack/common';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { TaskSchedulerService } from '@loopstack/core';
import { RunWorkflowPayloadDto } from '../dtos/run-workflow-payload.dto';
import { WorkflowApiService } from './workflow-api.service';

@Injectable()
export class ProcessorApiService {
  constructor(
    private taskSchedulerService: TaskSchedulerService,
    private workflowApiService: WorkflowApiService,
  ) {}

  async processWorkflow(workflowId: string, user: string, payload: RunWorkflowPayloadDto): Promise<void> {
    const workflow = await this.workflowApiService.findOneById(workflowId, user);

    await this.workflowApiService.setStatus(workflowId, user, WorkflowState.Pending);

    void this.taskSchedulerService.addTask({
      id: 'manual_workflow_execution-' + randomUUID(),
      workspaceId: workflow.workspaceId,
      task: {
        name: 'manual_execution',
        type: 'run_workflow',
        workflowId,
        payload: {
          ...payload,
        },
        user: user,
      },
    } satisfies ScheduledTask);
  }
}
