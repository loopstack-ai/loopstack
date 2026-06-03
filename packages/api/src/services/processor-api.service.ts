import { BadRequestException, Injectable } from '@nestjs/common';
import type { WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { StudioDiscoveryService } from '@loopstack/core';
import { RunWorkflowPayloadDto } from '../dtos/run-workflow-payload.dto.js';
import { StartWorkflowPayloadDto } from '../dtos/start-workflow-payload.dto.js';
import { WorkflowApiService } from './workflow-api.service.js';

@Injectable()
export class ProcessorApiService {
  constructor(
    private readonly workflowRunner: WorkflowRunner,
    private readonly workflowApiService: WorkflowApiService,
    private readonly studioDiscoveryService: StudioDiscoveryService,
  ) {}

  async processWorkflow(workflowId: string, user: string, payload: RunWorkflowPayloadDto): Promise<void> {
    await this.workflowApiService.findOneById(workflowId, user);
    await this.workflowRunner.runById(workflowId, user, { transition: payload.transition });
  }

  async startWorkflow(payload: StartWorkflowPayloadDto, userId: string): Promise<WorkflowRunResult> {
    const { workflowName } = payload;

    // Derive appName from which @StudioApp declares this workflow
    const appName = this.studioDiscoveryService.getAppNameForWorkflow(workflowName);
    if (!appName) {
      throw new BadRequestException(
        `Workflow "${workflowName}" is not declared in any @StudioApp({ workflows }) array.`,
      );
    }

    return this.workflowRunner.execute(
      workflowName,
      { workspaceId: payload.workspaceId, args: payload.args, labels: payload.labels },
      { userId, appName },
    );
  }
}
