import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { WorkspaceInterface } from '../interfaces/workspace.interface';

@Injectable()
export class WorkspaceCollectionService extends CollectionService<WorkspaceInterface> {
  create(workspaces: WorkspaceInterface[]): void {
    this.set(workspaces);
  }
}
