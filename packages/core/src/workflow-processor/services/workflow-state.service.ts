import { Injectable, Logger } from '@nestjs/common';
import { WorkflowEntity } from '@loopstack/common';
import { Workflow } from '../abstract';
import { WorkflowService } from '../../persistence';

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(block: Workflow): Promise<WorkflowEntity> {
    const workflow = await this.workflowService
      .createFindQuery(block.ctx.namespace?.id, {
        configKey: block.name,
        labels: block.ctx.labels,
      })
      .getOne();

    if (workflow) {
      return workflow;
    }

    return this.workflowService.create({
      createdBy: block.ctx.userId,
      labels: block.ctx.labels,
      namespace: block.ctx.namespace ?? undefined,
      pipelineId: block.ctx.pipelineId,
      configKey: block.name,
      title: block.config.title ?? block.name,
      ui: block.config.ui ?? null,
      index: block.ctx.index,
    });
  }
}
