import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { WorkflowInterface } from '../interfaces/workflow.interface';

@Injectable()
export class WorkflowCollectionService extends CollectionService<WorkflowInterface> {
  create(workflows: WorkflowInterface[]): void {
    this.set(workflows);
  }
}
