import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { LlmModelInterface } from '../interfaces/llm-model.interface';

@Injectable()
export class LlmModelCollectionService extends CollectionService<LlmModelInterface> {
  create(models: LlmModelInterface[]): void {
    this.set(models);
  }
}
