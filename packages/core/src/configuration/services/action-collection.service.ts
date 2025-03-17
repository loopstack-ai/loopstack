import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { ServiceConfigType } from '../schemas/service-config.schema';

@Injectable()
export class ActionCollectionService extends CollectionService<ServiceConfigType> {
  create(actions: ServiceConfigType[]): void {
    this.merge(actions);
  }
}
