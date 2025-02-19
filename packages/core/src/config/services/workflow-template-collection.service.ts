import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { WorkflowTemplateInterface } from '../interfaces/workflow-template.interface';

@Injectable()
export class WorkflowTemplateCollectionService extends CollectionService<WorkflowTemplateInterface> {
  create(templates: WorkflowTemplateInterface[]): void {
    this.set(templates);
  }
}
