import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import {
  PersistenceState,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import { WorkflowCheckpointService, WorkflowService } from '../../persistence/index.js';

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

  /**
   * Save workflow execution state from explicit state and metadata.
   */
  async saveExecutionState(
    workflowEntity: WorkflowEntity,
    state: Record<string, unknown>,
    meta: WorkflowMetadataInterface & { version: number },
    queryRunner?: QueryRunner,
  ) {
    workflowEntity.status = meta.status;
    workflowEntity.place = meta.place;
    workflowEntity.availableTransitions = meta.availableTransitions || null;
    workflowEntity.hasError = meta.hasError;
    workflowEntity.errorMessage = meta.errorMessage || null;
    workflowEntity.retryCount = meta.retryCount ?? 0;
    workflowEntity.retryTransitionId = meta.retryTransitionId ?? null;
    workflowEntity.result = meta.result as Record<string, unknown>;

    await this.saveWorkflowState(workflowEntity, meta.persistenceState, queryRunner);

    // Create a checkpoint row with the current state snapshot.
    const transition = meta.transition;
    const documents: { id?: string; isInvalidated?: boolean }[] = meta.documents ?? [];
    const documentIds = documents.filter((d) => d.id).map((d) => d.id!);
    const invalidatedDocumentIds = documents.filter((d) => d.id && d.isInvalidated).map((d) => d.id!);

    await this.workflowCheckpointService.createCheckpoint(
      {
        workflowId: workflowEntity.id,
        place: meta.place,
        transitionId: transition?.id ?? null,
        transitionFrom: transition?.from ?? null,
        state,
        documentIds,
        invalidatedDocumentIds,
        version: meta.version,
      },
      queryRunner,
    );
  }
}
