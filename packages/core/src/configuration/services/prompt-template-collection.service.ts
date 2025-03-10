import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { PromptTemplateType } from '../../processor/schemas/prompt-template.schema';

@Injectable()
export class PromptTemplateCollectionService extends CollectionService<PromptTemplateType> {
  create(templates: PromptTemplateType[]): void {
    this.merge(templates);
  }
}
