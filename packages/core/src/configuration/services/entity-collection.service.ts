import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { EntityType } from '../schemas/entity.schema';

@Injectable()
export class EntityCollectionService extends CollectionService<EntityType> {
  create(entities: EntityType[]): void {
    this.merge(entities);
  }
}
