import { Injectable, Logger } from '@nestjs/common';
import {
  PersistenceState,
  RunContext,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkflowInterface,
  getBlockConfig,
} from '@loopstack/common';
import { WorkflowType } from '@loopstack/contracts/types';
import { WorkflowCheckpointService, WorkflowService } from '../../persistence';
import { WorkflowExecutionContextManager } from '../utils/execution-context-manager';
import { WorkflowMemoryMonitorService } from './workflow-memory-monitor.service';

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(
    private workflowService: WorkflowService,
    private workflowCheckpointService: WorkflowCheckpointService,
    private memoryMonitor: WorkflowMemoryMonitorService,
  ) {}

  async getWorkflowState(block: WorkflowInterface, context: RunContext): Promise<WorkflowEntity> {
    this.memoryMonitor.logHeap(`workflow-state:before-load:${block.constructor.name}`);

    const workflow = await this.workflowService.findOneByQuery(context.parentWorkflowId, {
      blockName: block.constructor.name,
      labels: context.labels,
    });

    if (workflow) {
      this.memoryMonitor.logWorkflowEntityLoaded('workflow-state:loaded', workflow);
      return workflow;
    }

    const config = getBlockConfig<WorkflowType>(block) as WorkflowType;

    return this.workflowService.create({
      createdBy: context.userId,
      labels: context.labels,
      parentId: context.parentWorkflowId,
      workspaceId: context.workspaceId,
      blockName: block.constructor.name,
      className: block.constructor.name,
      title: config?.title ?? block.constructor.name,
      place: 'start',
    });
  }

  async getLatestCheckpoint(workflowId: string): Promise<WorkflowCheckpointEntity | null> {
    return this.workflowCheckpointService.getLatest(workflowId);
  }

  async saveWorkflowState(entity: WorkflowEntity, persistenceState: PersistenceState) {
    return this.workflowService.save(entity, persistenceState);
  }

  async saveExecutionState(workflowEntity: WorkflowEntity, ctx: WorkflowExecutionContextManager) {
    workflowEntity.status = ctx.getManager().getData('status');
    workflowEntity.place = ctx.getManager().getData('place');
    workflowEntity.documents = ctx.getManager().getData('documents');
    workflowEntity.availableTransitions = ctx.getManager().getData('availableTransitions') || null;
    workflowEntity.hasError = ctx.getManager().getData('hasError');
    workflowEntity.errorMessage = ctx.getManager().getData('errorMessage') || null;
    workflowEntity.result = ctx.getManager().getData('result') as Record<string, unknown>;
    workflowEntity.hashRecord = ctx.getManager().getData('hashRecord');

    await this.saveWorkflowState(workflowEntity, ctx.getManager().getData('persistenceState'));

    // Sync DB-assigned IDs back into StateManager so subsequent saves
    // don't re-insert the same documents as new rows.
    ctx.getManager().setData('documents', workflowEntity.documents);

    // Create a checkpoint row with the current state snapshot
    const transition = ctx.getManager().getData('transition');
    const documents: { id?: string; isInvalidated?: boolean }[] = workflowEntity.documents ?? [];
    const documentIds = documents.filter((d) => d.id).map((d) => d.id!);
    const invalidatedDocumentIds = documents.filter((d) => d.id && d.isInvalidated).map((d) => d.id!);

    await this.workflowCheckpointService.createCheckpoint({
      workflowId: workflowEntity.id,
      place: ctx.getManager().getData('place'),
      transitionId: transition?.id ?? null,
      transitionFrom: transition?.from ?? null,
      state: ctx.getManager().getAll() as Record<string, unknown>,
      tools: (ctx.getManager().getData('tools') as Record<string, unknown>) ?? {},
      documentIds,
      invalidatedDocumentIds,
      version: ctx.getManager().getVersion(),
    });
  }
}
