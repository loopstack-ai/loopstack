import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import {PromptTemplateConfigInterface} from "@loopstack/shared";

@Injectable()
export class PromptTemplateCollectionService extends CollectionService<PromptTemplateConfigInterface> {
  create(templates: PromptTemplateConfigInterface[]): void {
    this.set(templates);
  }
}
