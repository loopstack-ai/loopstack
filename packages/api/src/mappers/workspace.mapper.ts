import { WorkspaceEntity } from '@loopstack/common';
import { WorkspaceInterface, WorkspaceSchema } from '@loopstack/contracts/api';
import { assertResponse } from './assert-response.util.js';

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
