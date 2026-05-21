import { Injectable } from '@nestjs/common';
import { WorkflowRunner } from '@loopstack/core';
import { RunWorkflowPayloadDto } from '../dtos/run-workflow-payload.dto.js';
import { WorkflowApiService } from './workflow-api.service.js';

@Injectable()
export class ProcessorApiService {
  constructor(
    private readonly workflowRunner: WorkflowRunner,
    private readonly workflowApiService: WorkflowApiService,
  ) {}

  async processWorkflow(workflowId: string, user: string, _payload: RunWorkflowPayloadDto): Promise<void> {
    await this.workflowApiService.findOneById(workflowId, user);
    await this.workflowRunner.runById(workflowId, user);
  }

  async callbackWorkflow(
    workflowId: string,
    user: string,
    payload: Record<string, unknown>,
    transition: string,
  ): Promise<void> {
    await this.workflowApiService.findOneById(workflowId, user);
    await this.workflowRunner.resume(workflowId, user, payload, { transition });
  }
}
