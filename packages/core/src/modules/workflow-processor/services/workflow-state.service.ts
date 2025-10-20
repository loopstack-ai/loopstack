import { Injectable, Logger } from '@nestjs/common';
import { WorkflowService } from '../../persistence';
import {
  WorkflowType,
  WorkflowEntity,
} from '@loopstack/shared';
import { Workflow } from '../abstract';

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(
    block: Workflow,
  ): Promise<WorkflowEntity> {

    const workflow = await this.workflowService
      .createFindQuery(block.ctx.namespace?.id, {
        configKey: block.name,
        labels: block.ctx.labels,
      })
      .getOne();

    if (workflow) {
      return workflow;
    }

    const config = block.config as WorkflowType;

    return this.workflowService.create({
      createdBy: block.ctx.userId,
      labels: block.ctx.labels,
      namespace: block.ctx.namespace ?? undefined,
      pipelineId: block.ctx.pipelineId,
      configKey: block.name,
      title: config.title ?? block.name,
      ui: config.ui ?? null,
      index: block.ctx.index,
    });
  }

  async saveWorkflow(workflow: WorkflowEntity) {
    return this.workflowService.save(workflow);
  }
}
