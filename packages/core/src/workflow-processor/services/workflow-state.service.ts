import { Injectable } from '@nestjs/common';
import {
  BlockExecutionContextDto,
  PersistenceState,
  WorkflowEntity,
  WorkflowExecution,
  WorkflowInterface,
  getBlockConfig,
} from '@loopstack/common';
import { WorkflowType } from '@loopstack/contracts/dist/types';
import { WorkflowService } from '../../persistence';

@Injectable()
export class WorkflowStateService {
  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(block: WorkflowInterface, context: BlockExecutionContextDto): Promise<WorkflowEntity> {
    const workflow = await this.workflowService.findOneByQuery(context.namespace?.id, {
      blockName: block.constructor.name,
      labels: context.labels,
    });

    if (workflow) {
      return workflow;
    }

    const config = getBlockConfig<WorkflowType>(block) as WorkflowType;
    if (!config) {
      throw new Error(`Block ${block.constructor.name} is missing @BlockConfig decorator`);
    }

    return this.workflowService.create({
      createdBy: context.userId,
      labels: context.labels,
      namespace: context.namespace ?? undefined,
      pipelineId: context.pipelineId,
      blockName: block.constructor.name,
      title: config.title ?? block.constructor.name,
      ui: config.ui ?? null,
      index: context.index,
      place: 'start',
    });
  }

  async saveWorkflowState(entity: WorkflowEntity, persistenceState: PersistenceState) {
    return this.workflowService.save(entity, persistenceState);
  }

  async saveExecutionState(ctx: WorkflowExecution) {
    ctx.entity.history = ctx.state.serialize();

    // save selected info to entity directly
    ctx.entity.place = ctx.state.getMetadata('place');
    ctx.entity.documents = ctx.state.getMetadata('documents');
    ctx.entity.availableTransitions = ctx.runtime.availableTransitions || null;
    ctx.entity.hasError = ctx.runtime.error;

    await this.saveWorkflowState(ctx.entity, ctx.runtime.persistenceState);
  }
}
