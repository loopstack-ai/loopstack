import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { WorkflowTemplateConfigInterface } from '@loopstack/shared';

@Injectable()
export class WorkflowTemplateCollectionService extends CollectionService<WorkflowTemplateConfigInterface> {
  create(templates: WorkflowTemplateConfigInterface[]): void {
    this.merge(templates);
  }
}
