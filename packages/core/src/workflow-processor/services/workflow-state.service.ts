import { Injectable } from '@nestjs/common';
import { WorkflowEntity } from '@loopstack/common';
import { Workflow } from '../abstract';
import { WorkflowService } from '../../persistence';
import { PersistenceState } from '../../common';

@Injectable()
export class WorkflowStateService {
  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(block: Workflow): Promise<WorkflowEntity> {
    const workflow = await this.workflowService.findOneByQuery(
      block.ctx.namespace?.id,
      {
        blockName: block.name,
        labels: block.ctx.labels,
      },
    );

    if (workflow) {
      return workflow;
    }

    return this.workflowService.create({
      createdBy: block.ctx.userId,
      labels: block.ctx.labels,
      namespace: block.ctx.namespace ?? undefined,
      pipelineId: block.ctx.pipelineId,
      blockName: block.name,
      title: block.config.title ?? block.name,
      ui: block.config.ui ?? null,
      index: block.ctx.index,
    });
  }

  async saveWorkflowState(
    entity: WorkflowEntity,
    persistenceState: PersistenceState,
  ) {
    return this.workflowService.save(entity, persistenceState);
  }
}
