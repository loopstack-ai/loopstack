import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';

@Injectable()
export class SnippetCollectionService extends CollectionService<{ name: string; value: any; }> {
  create(snippets: { name: string; value: any; }[]): void {
    this.merge(snippets);
  }
}
