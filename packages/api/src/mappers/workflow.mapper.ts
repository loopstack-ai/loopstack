import { WorkflowCheckpointEntity, WorkflowEntity } from '@loopstack/common';
import {
  WorkflowCheckpointInterface,
  WorkflowCheckpointSchema,
  WorkflowFullInterface,
  WorkflowFullSchema,
  WorkflowItemInterface,
  WorkflowItemSchema,
  WorkflowStatusInterface,
  WorkflowStatusSchema,
} from '@loopstack/contracts/api';
import { assertResponse } from './assert-response.util.js';

/** `loadRelationCountAndMap` attaches the children count dynamically. */
type WorkflowEntityWithChildCount = WorkflowEntity & { hasChildren?: number };

export function toWorkflowItem(entity: WorkflowEntity): WorkflowItemInterface {
  return assertResponse(WorkflowItemSchema, {
    id: entity.id,
    workflowName: entity.workflowName,
    title: entity.title ?? null,
    run: entity.run,
    labels: entity.labels ?? [],
    status: entity.status,
    hasError: entity.hasError,
    place: entity.place,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    workspaceId: entity.workspaceId,
    parentId: entity.parentId ?? null,
    hasChildren: (entity as WorkflowEntityWithChildCount).hasChildren ?? 0,
  });
}

export function toWorkflowFull(entity: WorkflowEntity): WorkflowFullInterface {
  return assertResponse(WorkflowFullSchema, {
    ...toWorkflowItem(entity),
    errorMessage: entity.errorMessage ?? null,
    availableTransitions: entity.availableTransitions ?? null,
    args: entity.args,
    context: entity.context ?? {},
    callbackTransition: entity.callbackTransition ?? null,
  });
}

export function toWorkflowStatus(
  entity: Pick<WorkflowEntity, 'id' | 'status' | 'hasError' | 'errorMessage'>,
): WorkflowStatusInterface {
  return assertResponse(WorkflowStatusSchema, {
    id: entity.id,
    status: entity.status,
    hasError: entity.hasError,
    errorMessage: entity.errorMessage ?? null,
  });
}

export function toWorkflowCheckpoint(
  entity: Pick<WorkflowCheckpointEntity, 'id' | 'place' | 'transitionId' | 'transitionFrom' | 'version' | 'createdAt'>,
): WorkflowCheckpointInterface {
  return assertResponse(WorkflowCheckpointSchema, {
    id: entity.id,
    place: entity.place,
    transitionId: entity.transitionId ?? null,
    transitionFrom: entity.transitionFrom ?? null,
    version: entity.version,
    createdAt: entity.createdAt.toISOString(),
  });
}
