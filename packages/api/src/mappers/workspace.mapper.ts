import { WorkspaceEntity, assertResponse } from '@loopstack/common';
import { WorkspaceInterface, WorkspaceSchema } from '@loopstack/contracts/api';

export function toWorkspace(entity: WorkspaceEntity): WorkspaceInterface {
  return assertResponse(WorkspaceSchema, {
    id: entity.id,
    appName: entity.appName,
    title: entity.title,
    isFavourite: entity.isFavourite,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  });
}
