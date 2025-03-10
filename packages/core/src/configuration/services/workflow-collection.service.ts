import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { WorkflowDefaultType } from '../../processor/schemas/workflow.schema';

@Injectable()
export class WorkflowCollectionService extends CollectionService<WorkflowDefaultType> {
  create(workflows: WorkflowDefaultType[]): void {
    this.merge(workflows);
  }
}
