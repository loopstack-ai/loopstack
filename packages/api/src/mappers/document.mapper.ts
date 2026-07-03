import { DocumentEntity, assertResponse } from '@loopstack/common';
import { DocumentItemInterface, DocumentItemSchema } from '@loopstack/contracts/api';

export function toDocumentItem(entity: DocumentEntity): DocumentItemInterface {
  return assertResponse(DocumentItemSchema, {
    id: entity.id,
    documentName: entity.documentName,
    content: entity.content ?? null,
    validationError: entity.error ?? null,
    meta: entity.meta ?? null,
    isInvalidated: entity.isInvalidated,
    index: entity.index,
    transition: entity.transition ?? null,
    place: entity.place ?? null,
    labels: entity.labels ?? [],
    tags: entity.tags ?? [],
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    workspaceId: entity.workspaceId,
    workflowId: entity.workflowId,
  });
}
