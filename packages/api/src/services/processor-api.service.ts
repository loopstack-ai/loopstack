import { BadRequestException, Injectable } from '@nestjs/common';
import type { WorkflowRunResult } from '@loopstack/common';
import type { RunWorkflowPayloadInterface, StartWorkflowPayloadInterface } from '@loopstack/contracts/api';
import { WorkflowRunner } from '@loopstack/core';
import { StudioDiscoveryService } from '@loopstack/core';
import { WorkflowApiService } from './workflow-api.service.js';

@Injectable()
export class ProcessorApiService {
  constructor(
    private readonly workflowRunner: WorkflowRunner,
    private readonly workflowApiService: WorkflowApiService,
    private readonly studioDiscoveryService: StudioDiscoveryService,
  ) {}

  async processWorkflow(workflowId: string, user: string, payload: RunWorkflowPayloadInterface): Promise<void> {
    await this.workflowApiService.findOneById(workflowId, user);

    const transition = payload.transition
      ? {
          id: payload.transition.id,
          workflowId: payload.transition.workflowId,
          meta: payload.transition.meta,
          payload: this.buildTransitionEnvelope(payload.transition),
        }
      : undefined;

    await this.workflowRunner.runById(workflowId, user, { transition });
  }

  /**
   * Wrap a user-driven transition payload into the same envelope shape the framework
   * delivers for sub-workflow completions, so wait transitions see one consistent
   * `TransitionInput<TData>` regardless of trigger source.
   */
  private buildTransitionEnvelope(
    transition: NonNullable<RunWorkflowPayloadInterface['transition']>,
  ): Record<string, unknown> {
    const status = transition.status ?? 'completed';
    const errorMessage = transition.errorMessage ?? null;
    return {
      workflowId: transition.workflowId,
      status,
      hasError: status !== 'completed',
      errorMessage,
      data: transition.payload,
    };
  }

  async startWorkflow(payload: StartWorkflowPayloadInterface, userId: string): Promise<WorkflowRunResult> {
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
