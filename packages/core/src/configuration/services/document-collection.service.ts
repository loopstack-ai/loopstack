import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { DocumentType } from '@loopstack/shared';

@Injectable()
export class DocumentCollectionService extends CollectionService<DocumentType> {
  create(entities: DocumentType[]): void {
    this.merge(entities);
  }
}
