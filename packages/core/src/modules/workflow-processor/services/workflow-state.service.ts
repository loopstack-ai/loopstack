import { Injectable, Logger } from '@nestjs/common';
import { WorkflowService } from '../../persistence';
import {
  StateMachineType,
  WorkflowEntity,
} from '@loopstack/shared';
import { StateMachine } from '../abstract';

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(
    block: StateMachine,
  ): Promise<WorkflowEntity> {
    const workflow = await this.workflowService
      .createFindQuery(block.context.namespace?.id, {
        configKey: block.name,
        labels: block.context.labels,
      })
      .getOne();

    if (workflow) {
      return workflow;
    }

    const config = block.config as StateMachineType;

    return this.workflowService.create({
      createdBy: block.context.userId,
      labels: block.context.labels,
      namespace: block.context.namespace ?? undefined,
      pipelineId: block.context.pipelineId,
      configKey: block.name,
      title: config.title ?? block.name,
      ui: config.ui ?? null,
      index: block.context.index,
    });
  }

  async saveWorkflow(workflow: WorkflowEntity) {
    return this.workflowService.save(workflow);
  }
}
