import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { EntityConfigInterface } from '@loopstack/shared';

@Injectable()
export class EntityCollectionService extends CollectionService<EntityConfigInterface> {
  create(entities: EntityConfigInterface[]): void {
    this.merge(entities);
  }
}
