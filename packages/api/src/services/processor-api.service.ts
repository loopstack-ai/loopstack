import { BadRequestException, Injectable } from '@nestjs/common';
import type { WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { StudioDiscoveryService, WorkflowRegistryService } from '@loopstack/core';
import { RunWorkflowPayloadDto } from '../dtos/run-workflow-payload.dto.js';
import { StartWorkflowPayloadDto } from '../dtos/start-workflow-payload.dto.js';
import { WorkflowApiService } from './workflow-api.service.js';

@Injectable()
export class ProcessorApiService {
  constructor(
    private readonly workflowRunner: WorkflowRunner,
    private readonly workflowApiService: WorkflowApiService,
    private readonly workflowRegistryService: WorkflowRegistryService,
    private readonly studioDiscoveryService: StudioDiscoveryService,
  ) {}

  async processWorkflow(workflowId: string, user: string, payload: RunWorkflowPayloadDto): Promise<void> {
    await this.workflowApiService.findOneById(workflowId, user);
    await this.workflowRunner.runById(workflowId, user, { transition: payload.transition });
  }

  async startWorkflow(payload: StartWorkflowPayloadDto, userId: string): Promise<WorkflowRunResult> {
    // Validate the workflow exists in the registry
    const workflowClassName = payload.workflowName;
    try {
      this.workflowRegistryService.getByName(workflowClassName);
    } catch {
      throw new BadRequestException(`Workflow "${workflowClassName}" not found in the registry.`);
    }

    // Derive appName from which @StudioApp declares this workflow
    const appName = this.studioDiscoveryService.getAppNameForWorkflow(workflowClassName);
    if (!appName) {
      throw new BadRequestException(
        `Workflow "${workflowClassName}" is not declared in any @StudioApp({ workflows }) array.`,
      );
    }

    return this.workflowRunner.execute(
      // WorkflowRunner.execute expects a class reference; we look it up by name
      // and pass the constructor. The registry stores instances, but execute()
      // resolves the instance internally — we just need the class.
      this.getWorkflowClass(workflowClassName),
      { workspaceId: payload.workspaceId, args: payload.args },
      { userId, appName },
    );
  }

  private getWorkflowClass(workflowClassName: string) {
    const instance = this.workflowRegistryService.getByName(workflowClassName);
    return instance.constructor as any;
  }
}
