import { Injectable } from '@nestjs/common';
import { WorkflowEntity } from '@loopstack/common';
import { WorkflowBase } from '../abstract';
import { WorkflowService } from '../../persistence';
import { BlockExecutionContextDto, PersistenceState } from '../../common';
import { WorkflowExecution } from '../interfaces/workflow-execution.interface';

@Injectable()
export class WorkflowStateService {
  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(block: WorkflowBase, context: BlockExecutionContextDto): Promise<WorkflowEntity> {
    const workflow = await this.workflowService.findOneByQuery(
      context.namespace?.id,
      {
        blockName: block.name,
        labels: context.labels,
      },
    );

    if (workflow) {
      return workflow;
    }

    const config = block.getConfig();

    return this.workflowService.create({
      createdBy: context.userId,
      labels: context.labels,
      namespace: context.namespace ?? undefined,
      pipelineId: context.pipelineId,
      blockName: block.name,
      title: config.title ?? block.name,
      ui: config.ui ?? null,
      index: context.index,
      place: 'start',
    });
  }

  async saveWorkflowState(
    entity: WorkflowEntity,
    persistenceState: PersistenceState,
  ) {
    return this.workflowService.save(entity, persistenceState);
  }

  async saveExecutionState(ctx: WorkflowExecution) {
    ctx.entity.history = ctx.state.caretaker.serialize();

    // save selected info to entity directly
    ctx.entity.place = ctx.state.getMetadata('place');
    ctx.entity.documents = ctx.state.getMetadata('documents');
    ctx.entity.availableTransitions = ctx.runtime.availableTransitions || null;
    ctx.entity.hasError = ctx.runtime.error;

    await this.saveWorkflowState(
      ctx.entity,
      ctx.runtime.persistenceState,
    );
  }
}
