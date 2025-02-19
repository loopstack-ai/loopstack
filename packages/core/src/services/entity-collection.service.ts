import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { EntityInterface } from '../interfaces/entity.interface';

@Injectable()
export class EntityCollectionService extends CollectionService<EntityInterface> {
  create(entities: EntityInterface[]): void {
    this.set(entities);
  }
}
