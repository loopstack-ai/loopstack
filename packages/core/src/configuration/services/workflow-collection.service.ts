import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import {WorkflowConfigInterface} from "@loopstack/shared";

@Injectable()
export class WorkflowCollectionService extends CollectionService<WorkflowConfigInterface> {
  create(workflows: WorkflowConfigInterface[]): void {
    this.set(workflows);
  }
}
