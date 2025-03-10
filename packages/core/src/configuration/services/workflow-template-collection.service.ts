import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { WorkflowTemplateType } from '../schemas/workflow-template.schema';

@Injectable()
export class WorkflowTemplateCollectionService extends CollectionService<WorkflowTemplateType> {
  create(templates: WorkflowTemplateType[]): void {
    this.merge(templates);
  }
}
