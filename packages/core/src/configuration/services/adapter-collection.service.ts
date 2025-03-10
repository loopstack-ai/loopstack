import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { AdapterType } from '../schemas/adapter.schema';

@Injectable()
export class AdapterCollectionService extends CollectionService<AdapterType> {
  create(models: AdapterType[]): void {
    this.merge(models);
  }
}
