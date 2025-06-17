import { Injectable, Logger } from '@nestjs/common';
import { WorkflowService } from '../../persistence';
import {
  ContextInterface,
  WorkflowEntity,
  WorkflowType,
} from '@loopstack/shared';

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(
    workflowConfig: WorkflowType,
    context: ContextInterface,
  ): Promise<WorkflowEntity> {
    const workflow = await this.workflowService
      .createFindQuery(context.namespace?.id, {
        name: workflowConfig.name,
        labels: context.labels,
      })
      .getOne();

    if (workflow) {
      return workflow;
    }

    return this.workflowService.create({
      createdBy: context.userId,
      labels: context.labels,
      namespace: context.namespace ?? undefined,
      pipelineId: context.pipelineId,
      name: workflowConfig.name,
      title: workflowConfig.title ?? workflowConfig.name,
      ui: workflowConfig.ui ?? null,
      index: context.index,
    });
  }
}
