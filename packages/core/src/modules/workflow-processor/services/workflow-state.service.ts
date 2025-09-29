import { Injectable, Logger } from '@nestjs/common';
import { WorkflowService } from '../../persistence';
import {
  ContextInterface, StateMachineType,
  WorkflowEntity,
} from '@loopstack/shared';
import { Block } from '../../configuration';

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(
    block: Block,
    context: ContextInterface,
  ): Promise<WorkflowEntity> {
    const workflow = await this.workflowService
      .createFindQuery(context.namespace?.id, {
        configKey: block.target.name,
        labels: context.labels,
      })
      .getOne();

    if (workflow) {
      return workflow;
    }

    const config = block.config as StateMachineType;

    return this.workflowService.create({
      createdBy: context.userId,
      labels: context.labels,
      namespace: context.namespace ?? undefined,
      pipelineId: context.pipelineId,
      configKey: block.target.name,
      title: config.title ?? block.target.name,
      ui: config.ui ?? null,
      index: context.index,
    });
  }
}
