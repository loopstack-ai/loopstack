import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { PromptTemplateInterface } from '../interfaces/prompt-template.interface';

@Injectable()
export class PromptTemplateCollectionService extends CollectionService<PromptTemplateInterface> {
  create(templates: PromptTemplateInterface[]): void {
    this.set(templates);
  }
}
