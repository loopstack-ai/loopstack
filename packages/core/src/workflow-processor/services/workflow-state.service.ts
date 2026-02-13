import { Injectable } from '@nestjs/common';
import { PersistenceState, RunContext, WorkflowEntity, WorkflowInterface, getBlockConfig } from '@loopstack/common';
import { WorkflowType } from '@loopstack/contracts/types';
import { WorkflowService } from '../../persistence';
import { WorkflowExecutionContextManager } from '../utils/execution-context-manager';

@Injectable()
export class WorkflowStateService {
  constructor(private workflowService: WorkflowService) {}

  async getWorkflowState(block: WorkflowInterface, context: RunContext): Promise<WorkflowEntity> {
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

  async saveExecutionState(workflowEntity: WorkflowEntity, ctx: WorkflowExecutionContextManager) {
    workflowEntity.status = ctx.getManager().getData('status');
    workflowEntity.history = ctx.getManager().serialize();
    workflowEntity.place = ctx.getManager().getData('place');
    workflowEntity.documents = ctx.getManager().getData('documents');
    workflowEntity.availableTransitions = ctx.getManager().getData('availableTransitions') || null;
    workflowEntity.hasError = ctx.getManager().getData('hasError');
    workflowEntity.errorMessage = ctx.getManager().getData('errorMessage') || null;
    workflowEntity.result = ctx.getManager().getData('result') as Record<string, unknown>;
    workflowEntity.hashRecord = ctx.getManager().getData('hashRecord');

    await this.saveWorkflowState(workflowEntity, ctx.getManager().getData('persistenceState'));
  }
}
