import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { ServiceConfigType } from '../schemas/service-config.schema';

@Injectable()
export class ToolCollectionService extends CollectionService<ServiceConfigType> {
  create(tools: ServiceConfigType[]): void {
    this.merge(tools);
  }
}
