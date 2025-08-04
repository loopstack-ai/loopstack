import { Injectable, Logger } from '@nestjs/common';
import { WorkflowService } from '../../persistence';
import {
  ConfigElement,
  ContextInterface,
  WorkflowEntity,
  WorkflowType,
} from '@loopstack/shared';

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(
    configElement: ConfigElement<WorkflowType>,
    context: ContextInterface,
  ): Promise<WorkflowEntity> {
    const workflow = await this.workflowService
      .createFindQuery(context.namespace?.id, {
        configKey: configElement.key,
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
      configKey: configElement.key,
      title: configElement.config.title ?? configElement.name,
      ui: configElement.config.ui ?? null,
      index: context.index,
    });
  }
}
