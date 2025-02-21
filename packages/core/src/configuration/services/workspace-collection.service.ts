import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { WorkspaceConfigInterface } from '@loopstack/shared';

@Injectable()
export class WorkspaceCollectionService extends CollectionService<WorkspaceConfigInterface> {
  create(workspaces: WorkspaceConfigInterface[]): void {
    this.merge(workspaces);
  }
}
