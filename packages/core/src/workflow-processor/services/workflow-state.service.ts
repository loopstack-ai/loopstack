import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { PersistenceState, WorkflowCheckpointEntity, WorkflowEntity } from '@loopstack/common';
import { WorkflowCheckpointService, WorkflowService } from '../../persistence';
import { WorkflowExecutionContextManager } from '../utils/execution-context-manager';

@Injectable()
export class WorkflowStateService {
  constructor(
    private workflowService: WorkflowService,
    private workflowCheckpointService: WorkflowCheckpointService,
  ) {}

  async getLatestCheckpoint(workflowId: string): Promise<WorkflowCheckpointEntity | null> {
    return this.workflowCheckpointService.getLatest(workflowId);
  }

  async saveWorkflowState(entity: WorkflowEntity, persistenceState: PersistenceState, queryRunner?: QueryRunner) {
    return this.workflowService.save(entity, persistenceState, queryRunner);
  }

  async saveExecutionState(
    workflowEntity: WorkflowEntity,
    ctx: WorkflowExecutionContextManager,
    queryRunner?: QueryRunner,
  ) {
    workflowEntity.status = ctx.getManager().getData('status');
    workflowEntity.place = ctx.getManager().getData('place');
    workflowEntity.availableTransitions = ctx.getManager().getData('availableTransitions') || null;
    workflowEntity.hasError = ctx.getManager().getData('hasError');
    workflowEntity.errorMessage = ctx.getManager().getData('errorMessage') || null;
    workflowEntity.result = ctx.getManager().getData('result') as Record<string, unknown>;

    await this.saveWorkflowState(workflowEntity, ctx.getManager().getData('persistenceState'), queryRunner);

    // Create a checkpoint row with the current state snapshot.
    // Documents already have DB-assigned IDs from immediate persistence.
    const transition = ctx.getManager().getData('transition');
    const documents: { id?: string; isInvalidated?: boolean }[] = ctx.getManager().getData('documents') ?? [];
    const documentIds = documents.filter((d) => d.id).map((d) => d.id!);
    const invalidatedDocumentIds = documents.filter((d) => d.id && d.isInvalidated).map((d) => d.id!);

    await this.workflowCheckpointService.createCheckpoint(
      {
        workflowId: workflowEntity.id,
        place: ctx.getManager().getData('place'),
        transitionId: transition?.id ?? null,
        transitionFrom: transition?.from ?? null,
        state: ctx.getManager().getAll() as Record<string, unknown>,
        tools: (ctx.getManager().getData('tools') as Record<string, unknown>) ?? {},
        documentIds,
        invalidatedDocumentIds,
        version: ctx.getManager().getVersion(),
      },
      queryRunner,
    );
  }
}
