import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { WorkspaceType } from '../../processor/schemas/workspace.schema';

@Injectable()
export class WorkspaceCollectionService extends CollectionService<WorkspaceType> {
  create(workspaces: WorkspaceType[]): void {
    this.merge(workspaces);
  }
}
